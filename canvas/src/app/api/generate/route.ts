import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSize } from "@/lib/size-map";
import type { AspectRatio, Quality } from "@/lib/size-map";
import { requireUser, AuthError } from "@/lib/c-auth";

interface GenerateRequest {
  prompt: string;
  aspectRatio: AspectRatio;
  quality: Quality;
  count: number;
  model?: string;
  referenceImages?: string[];
  stylePresetId?: number;
}

async function getCreditsPerImage(modelId?: string): Promise<number> {
  if (modelId) {
    const modelConfig = await prisma.modelConfig.findFirst({
      where: { modelId, enabled: true },
      select: { userCreditCost: true },
    });
    if (modelConfig) {
      const cost = Number(modelConfig.userCreditCost);
      if (Number.isFinite(cost) && cost > 0) {
        return cost;
      }
    }
  }

  const { getSetting } = await import("@/lib/system-settings");
  const creditsRaw = await getSetting("credits_per_image", "CREDITS_PER_IMAGE", "0.07");
  const parsed = parseFloat(creditsRaw ?? "0.07");
  return Number.isFinite(parsed) && parsed >= 0.01 ? parsed : 0.07;
}

async function getModelInfo(modelId: string | undefined) {
  const defaultModel = "gpt-image-2";

  if (modelId) {
    const modelConfig = await prisma.modelConfig.findFirst({
      where: { modelId, enabled: true },
      select: {
        modelId: true,
        provider: true,
        displayName: true,
      },
    });

    if (modelConfig) {
      return {
        modelId: modelConfig.modelId,
        provider: modelConfig.provider,
        displayName: modelConfig.displayName,
      };
    }
  }

  const defaultConfig = await prisma.modelConfig.findFirst({
    where: { enabled: true, userSelectable: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      modelId: true,
      provider: true,
      displayName: true,
    },
  });

  if (defaultConfig) {
    return {
      modelId: defaultConfig.modelId,
      provider: defaultConfig.provider,
      displayName: defaultConfig.displayName,
    };
  }

  return {
    modelId: defaultModel,
    provider: "openai",
    displayName: "GPT Image2",
  };
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: e.message, code: e.code },
        { status: e.statusCode }
      );
    }
    throw e;
  }

  let body: GenerateRequest;
  try {
    body = (await request.json()) as GenerateRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "请求体解析失败" },
      { status: 400 }
    );
  }

  const { prompt, aspectRatio, quality, count, model, referenceImages, stylePresetId } =
    body;

  if (!prompt || !aspectRatio || !quality || !count) {
    return NextResponse.json(
      { success: false, error: "参数不完整" },
      { status: 400 }
    );
  }
  if (![1, 2, 4].includes(count)) {
    return NextResponse.json(
      { success: false, error: "生成数量只能是 1、2 或 4" },
      { status: 400 }
    );
  }

  const modelInfo = await getModelInfo(model);
  const creditsPerImage = await getCreditsPerImage(modelInfo.modelId);
  const totalCost = creditsPerImage * count;

  if (user.balance < totalCost) {
    return NextResponse.json(
      {
        success: false,
        error: "积分不足",
        code: "INSUFFICIENT_BALANCE",
        remaining: user.balance,
        required: totalCost,
      },
      { status: 402 }
    );
  }

  let finalPrompt = prompt;
  if (stylePresetId) {
    const preset = await prisma.stylePreset.findUnique({
      where: { id: stylePresetId },
      select: { promptPrefix: true },
    });
    if (preset?.promptPrefix) {
      finalPrompt = `${preset.promptPrefix} ${prompt}`;
    }
  }

  const sizeConfig = getSize(aspectRatio, quality);
  const promptSummary = prompt.slice(0, 200);
  const groupId = randomUUID();
  const refImagesJson =
    referenceImages && referenceImages.length > 0
      ? JSON.stringify(referenceImages)
      : null;

  let tasks: { id: number }[];
  try {
    tasks = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: new Prisma.Decimal(totalCost) } },
        select: { balance: true },
      });
      if (Number(updated.balance) < 0) {
        throw new Error("BALANCE_RACE");
      }
      const created: { id: number }[] = [];
      for (let i = 0; i < count; i++) {
        const idempotencyKey = `${groupId}-${i}`;
        const t = await tx.imageTask.create({
          data: {
            userId: user.id,
            groupId,
            status: "pending",
            prompt: finalPrompt,
            promptSummary,
            aspectRatio,
            quality,
            size: sizeConfig.size,
            referenceImagesJson: refImagesJson,
            stylePresetId: stylePresetId ?? null,
            creditsLocked: new Prisma.Decimal(creditsPerImage),
            provider: modelInfo.provider,
            model: modelInfo.modelId,
            source: "worker",
            idempotencyKey,
          },
          select: { id: true },
        });
        created.push(t);
      }
      return created;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "BALANCE_RACE") {
      return NextResponse.json(
        {
          success: false,
          error: "积分不足",
          code: "INSUFFICIENT_BALANCE",
        },
        { status: 402 }
      );
    }
    console.error("generate billing failed:", err);
    return NextResponse.json(
      { success: false, error: "扣费异常，请稍后重试" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    groupId,
    tasks: tasks.map((t) => ({ id: t.id })),
  });
}
