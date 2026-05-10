import { prisma } from "./prisma";

interface CacheEntry {
  value: string | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 60 * 1000;

async function readFromDb(key: string): Promise<string | null> {
  const row = await prisma.systemSetting.findUnique({
    where: { key },
    select: { value: true },
  });
  return row?.value ?? null;
}

async function readWithCache(key: string): Promise<string | null> {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }
  const value = await readFromDb(key);
  cache.set(key, { value, expiresAt: now + TTL_MS });
  return value;
}

function pickEnv(envKey?: string): string | undefined {
  if (!envKey) return undefined;
  const v = process.env[envKey];
  return v && v.trim() ? v.trim() : undefined;
}

export async function getSetting(
  key: string,
  envKey?: string,
  defaultValue?: string
): Promise<string | undefined> {
  const dbValue = await readWithCache(key);
  if (dbValue && dbValue.trim()) return dbValue.trim();
  return pickEnv(envKey) ?? defaultValue;
}

export async function getRequiredSetting(
  key: string,
  envKey: string | undefined,
  errorMessage: string
): Promise<string> {
  const value = await getSetting(key, envKey);
  if (!value) throw new Error(errorMessage);
  return value;
}

export function invalidateSettingsCache(keys?: string[]) {
  if (!keys || keys.length === 0) {
    cache.clear();
    return;
  }
  for (const k of keys) cache.delete(k);
}
