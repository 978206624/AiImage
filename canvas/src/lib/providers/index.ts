export * from "./base";
export * from "./openai-image";
export * from "./gemini-image";

import "server-only";
import { prisma } from "../prisma";
import type { ImageProvider } from "./base";
import { OpenAIImageProvider } from "./openai-image";
import { GeminiImageProvider } from "./gemini-image";

interface CacheEntry {
  provider: ImageProvider;
  cachedAt: number;
  enabled: boolean;
}

const CACHE_TTL_MS = 60_000;
const providerCache = new Map<string, CacheEntry>();

function isCacheValid(entry: CacheEntry): boolean {
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    return false;
  }
  return entry.enabled;
}

export async function getProvider(modelId: string): Promise<ImageProvider | null> {
  const cached = providerCache.get(modelId);

  if (cached && isCacheValid(cached)) {
    return cached.provider;
  }

  const modelConfig = await prisma.modelConfig.findFirst({
    where: {
      modelId,
      enabled: true,
    },
  });

  if (!modelConfig) {
    providerCache.delete(modelId);
    return null;
  }

  let provider: ImageProvider;
  const timeoutMs = (modelConfig.timeoutSeconds ?? 120) * 1000;

  if (modelConfig.provider === "openai") {
    provider = new OpenAIImageProvider(modelConfig.modelId, timeoutMs);
  } else if (modelConfig.provider === "google") {
    provider = new GeminiImageProvider(modelConfig.modelId, timeoutMs);
  } else {
    providerCache.delete(modelId);
    return null;
  }

  providerCache.set(modelId, {
    provider,
    cachedAt: Date.now(),
    enabled: modelConfig.enabled,
  });

  return provider;
}

export async function getUserSelectableModels() {
  const models = await prisma.modelConfig.findMany({
    where: {
      enabled: true,
      userSelectable: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return models.map((m) => ({
    id: m.modelId,
    name: m.displayName,
    provider: m.provider,
    description: `${m.provider.toUpperCase()} ${m.modelId}`,
  }));
}

export async function getModelConfig(modelId: string) {
  return prisma.modelConfig.findFirst({
    where: { modelId, enabled: true },
  });
}

export function clearProviderCache(): void {
  providerCache.clear();
}

export function clearProviderCacheForModel(modelId: string): void {
  providerCache.delete(modelId);
}
