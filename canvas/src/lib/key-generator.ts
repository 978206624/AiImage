import { randomBytes } from "crypto";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const KEY_LENGTH = 16;
const PREFIX = "CV-";

export function generateKey(): string {
  const bytes = randomBytes(KEY_LENGTH);
  let result = "";
  for (let i = 0; i < KEY_LENGTH; i++) {
    result += CHARSET[bytes[i] % CHARSET.length];
  }
  return PREFIX + result;
}

export function generateKeys(count: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    keys.push(generateKey());
  }
  return keys;
}
