import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/c-auth";

interface ParsedParams {
  prompt: string | null;
  aspectRatio: string | null;
  quality: string | null;
  count: number | null;
  stylePresetId: number | null;
  referenceImages: string[];
}

function parseParams(json: string | null): ParsedParams {
  if (!json) {
    return {
      prompt: null,
      aspectRatio: null,
      quality: null,
      count: null,
      stylePresetId: null,
      referenceImages: [],
    };
  }
  try {
    const p = JSON.parse(json);
    return {
      prompt: typeof p.prompt === "string" ? p.prompt : null,
      aspectRatio: typeof p.aspectRatio === "string" ? p.aspectRatio : null,
      quality: typeof p.quality === "string" ? p.quality : null,
      count: typeof p.count === "number" ? p.count : null,
      stylePresetId:
        typeof p.stylePresetId === "number" ? p.stylePresetId : null,
      referenceImages: Array.isArray(p.referenceImages)
        ? p.referenceImages.filter((s: unknown) => typeof s === "string")
        : [],
    };
  } catch {
    return {
      prompt: null,
      aspectRatio: null,
      quality: null,
      count: null,
      stylePresetId: null,
      referenceImages: [],
    };
  }
}

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw
    ? Math.min(50, Math.max(1, parseInt(limitRaw, 10) || 0))
    : null;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10) || 20)
  );

  const startTime = searchParams.get("startTime");
  const endTime = searchParams.get("endTime");

  const where: { userId: number; createdAt?: { gte?: Date; lte?: Date } } = {
    userId: user.id,
  };
  if (startTime || endTime) {
    where.createdAt = {};
    if (startTime) {
      const d = new Date(startTime);
      if (!Number.isNaN(d.getTime())) where.createdAt.gte = d;
    }
    if (endTime) {
      const d = new Date(endTime);
      if (!Number.isNaN(d.getTime())) where.createdAt.lte = d;
    }
  }

  if (limit !== null) {
    const rows = await prisma.usageRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        imageUrl: true,
        isPersisted: true,
        promptSummary: true,
        paramsJson: true,
        createdAt: true,
      },
    });
    return NextResponse.json({
      success: true,
      data: {
        items: rows.map((r) => formatItem(r)),
        limit,
      },
    });
  }

  const skip = (page - 1) * pageSize;
  const [rows, total] = await Promise.all([
    prisma.usageRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        imageUrl: true,
        isPersisted: true,
        promptSummary: true,
        paramsJson: true,
        createdAt: true,
      },
    }),
    prisma.usageRecord.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      items: rows.map((r) => formatItem(r)),
      page,
      pageSize,
      total,
      hasMore: skip + rows.length < total,
    },
  });
}

interface RawRow {
  id: number;
  imageUrl: string | null;
  isPersisted: boolean;
  promptSummary: string | null;
  paramsJson: string | null;
  createdAt: Date;
}

function formatItem(r: RawRow) {
  const params = parseParams(r.paramsJson);
  return {
    id: r.id,
    imageUrl: r.imageUrl,
    isPersisted: r.isPersisted,
    promptSummary: r.promptSummary,
    prompt: params.prompt,
    modelTag: "gpt-4o-image",
    aspectRatio: params.aspectRatio,
    quality: params.quality,
    count: params.count,
    stylePresetId: params.stylePresetId,
    referenceImages: params.referenceImages,
    createdAt: r.createdAt,
  };
}
