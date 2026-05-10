import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "未授权" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const userId = parseInt(id);
  if (!Number.isFinite(userId) || userId <= 0) {
    return NextResponse.json(
      { success: false, error: "无效 ID" },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") || "20") || 20)
  );
  const skip = (page - 1) * pageSize;

  const [records, total] = await Promise.all([
    prisma.usageRecord.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        creditsUsed: true,
        promptSummary: true,
        imageUrl: true,
        isPersisted: true,
        createdAt: true,
      },
    }),
    prisma.usageRecord.count({ where: { userId } }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      records: records.map((r) => ({
        id: r.id,
        creditsUsed: Number(r.creditsUsed),
        promptSummary: r.promptSummary,
        imageUrl: r.imageUrl,
        isPersisted: r.isPersisted,
        createdAt: r.createdAt,
      })),
      total,
      page,
      pageSize,
    },
  });
}
