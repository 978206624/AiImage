import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { submitTask } from "@/lib/gpt-image";
import { pollManager } from "@/lib/poll-manager";
import { getSize } from "@/lib/size-map";
import type { AspectRatio, Quality } from "@/lib/size-map";
import { getSetting } from "@/lib/system-settings";
import { requireUser, AuthError } from "@/lib/c-auth";

interface GenerateRequest {
  prompt: string;
  aspectRatio: AspectRatio;
  quality: Quality;
  count: number;
  referenceImages?: string[];
  stylePresetId?: number;
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

  const { prompt, aspectRatio, quality, count, referenceImages, stylePresetId } =
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

  const creditsRaw = await getSetting(
    "credits_per_image",
    "CREDITS_PER_IMAGE",
    "0.07"
  );
  const parsed = parseFloat(creditsRaw ?? "0.07");
  const creditsPerImage =
    Number.isFinite(parsed) && parsed >= 0.01 ? parsed : 0.07;
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

  await Promise.all(
    tasks.map(async ({ id: taskId }) => {
      try {
        const result = await submitTask({
          prompt: finalPrompt,
          size: sizeConfig.size,
          quality,
          referenceImages,
        });
        if (result.async) {
          await prisma.imageTask.update({
            where: { id: taskId },
            data: {
              status: "submitted",
              externalTaskId: result.taskId,
            },
          });
          pollManager.startPolling(taskId);
        } else {
          await pollManager.completeTask(taskId, user.id, result.imageUrl);
        }
      } catch (err) {
        const reason =
          err instanceof Error ? err.message : "提交失败";
        await pollManager.failTask(taskId, reason);
      }
    })
  );

  return NextResponse.json({
    success: true,
    groupId,
    tasks: tasks.map((t) => ({ id: t.id })),
  });
}
