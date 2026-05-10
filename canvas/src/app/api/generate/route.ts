import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateImage } from "@/lib/gpt-image";
import { getSize } from "@/lib/size-map";
import type { AspectRatio, Quality } from "@/lib/size-map";

interface GenerateRequest {
  key: string;
  prompt: string;
  aspectRatio: AspectRatio;
  quality: Quality;
  count: number;
  referenceImages?: string[];
  stylePresetId?: number;
}

export async function POST(request: Request) {
  try {
    const body: GenerateRequest = await request.json();
    const { key, prompt, aspectRatio, quality, count, referenceImages, stylePresetId } = body;

    if (!key || !prompt || !aspectRatio || !quality || !count) {
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

    const apiKey = await prisma.apiKey.findUnique({
      where: { key: key.trim() },
    });

    if (!apiKey || apiKey.status !== "active") {
      return NextResponse.json(
        { success: false, error: apiKey ? "Key 已禁用" : "Key 无效" },
        { status: 403 }
      );
    }

    const creditsPerImage = parseFloat(process.env.CREDITS_PER_IMAGE || "0.07");
    const totalCost = creditsPerImage * count;
    const remaining = Number(apiKey.totalCredits) - Number(apiKey.usedCredits);

    if (remaining < totalCost) {
      return NextResponse.json(
        { success: false, error: "积分不足", remaining, required: totalCost },
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

    const generateSingle = async (): Promise<string> => {
      return generateImage({
        prompt: finalPrompt,
        size: sizeConfig.size,
        referenceImages,
      });
    };

    const tasks = Array.from({ length: count }, () => generateSingle());
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

    await prisma.$transaction([
      prisma.apiKey.update({
        where: { id: apiKey.id },
        data: {
          usedCredits: { increment: actualCost },
          lastUsedAt: new Date(),
        },
      }),
      ...images.map((imageUrl) =>
        prisma.usageRecord.create({
          data: {
            apiKeyId: apiKey.id,
            creditsUsed: creditsPerImage,
            promptSummary,
            imageUrl,
          },
        })
      ),
    ]);

    const newRemaining = remaining - actualCost;

    return NextResponse.json({
      success: true,
      images,
      errors: errors.length > 0 ? errors : undefined,
      creditsUsed: actualCost,
      remainingCredits: newRemaining,
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
