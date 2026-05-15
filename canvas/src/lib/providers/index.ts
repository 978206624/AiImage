export * from "./base";
export * from "./openai-image";
export * from "./gemini-image";

import "server-only";
import { prisma } from "../prisma";
import type { ImageProvider } from "./base";
import { OpenAIImageProvider } from "./openai-image";
import { GeminiImageProvider } from "./gemini-image";

const providerCache = new Map<string, ImageProvider>();

export async function getProvider(modelId: string): Promise<ImageProvider | null> {
  if (providerCache.has(modelId)) {
    return providerCache.get(modelId)!;
  }

  const modelConfig = await prisma.modelConfig.findFirst({
    where: {
      modelId,
      enabled: true,
    },
  });

  if (!modelConfig) {
    return null;
  }

  let provider: ImageProvider;

  if (modelConfig.provider === "openai") {
    provider = new OpenAIImageProvider(modelConfig.modelId);
  } else if (modelConfig.provider === "google") {
    provider = new GeminiImageProvider(modelConfig.modelId);
  } else {
    return null;
  }

  providerCache.set(modelId, provider);
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

export function clearProviderCache() {
  providerCache.clear();
}
