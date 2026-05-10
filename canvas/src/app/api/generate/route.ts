import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { generateImage } from "@/lib/gpt-image";
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

  try {
    const body: GenerateRequest = await request.json();
    const { prompt, aspectRatio, quality, count, referenceImages, stylePresetId } = body;

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

    const tasks = Array.from({ length: count }, () =>
      generateImage({
        prompt: finalPrompt,
        size: sizeConfig.size,
        referenceImages,
      })
    );
    const results = await Promise.allSettled(tasks);

    const images: string[] = [];
    const errors: string[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        images.push(result.value);
      } else {
        errors.push(result.reason?.message || "生成失败");
      }
    }

    if (images.length === 0) {
      return NextResponse.json(
        { success: false, error: errors[0] || "所有图片生成失败" },
        { status: 500 }
      );
    }

    const actualCost = creditsPerImage * images.length;
    const promptSummary = prompt.slice(0, 200);
    const paramsJson = JSON.stringify({
      prompt,
      aspectRatio,
      quality,
      count,
      stylePresetId: stylePresetId ?? null,
      referenceImages: referenceImages ?? [],
    });

    let billingSuccess = true;
    let newBalance = user.balance;

    const runBillingTx = () =>
      prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: user.id },
          data: { balance: { decrement: new Prisma.Decimal(actualCost) } },
          select: { balance: true },
        });
        await tx.usageRecord.createMany({
          data: images.map((imageUrl) => ({
            userId: user.id,
            apiKeyId: null,
            creditsUsed: new Prisma.Decimal(creditsPerImage),
            promptSummary,
            imageUrl,
            paramsJson,
          })),
        });
        return Number(updated.balance);
      });

    try {
      newBalance = await runBillingTx();
    } catch (firstErr) {
      try {
        newBalance = await runBillingTx();
      } catch (retryErr) {
        console.error("billing transaction failed after retry:", {
          userId: user.id,
          actualCost,
          imageCount: images.length,
          error: retryErr instanceof Error ? retryErr.message : retryErr,
        });
        billingSuccess = false;
      }
    }

    return NextResponse.json({
      success: true,
      images,
      errors: errors.length > 0 ? errors : undefined,
      creditsUsed: billingSuccess ? actualCost : 0,
      remainingCredits: newBalance,
      billingError: billingSuccess ? undefined : "扣费异常，请联系管理员",
    });
  } catch (error) {
    console.error("generate error:", error);
    const message = error instanceof Error ? error.message : "生图失败";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
