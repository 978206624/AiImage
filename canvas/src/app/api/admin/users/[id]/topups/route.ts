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

  const [keys, total] = await Promise.all([
    prisma.apiKey.findMany({
      where: { redeemedBy: userId },
      orderBy: { redeemedAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        key: true,
        totalCredits: true,
        usedCredits: true,
        redeemedAt: true,
      },
    }),
    prisma.apiKey.count({ where: { redeemedBy: userId } }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      records: keys.map((k) => ({
        id: k.id,
        key: k.key,
        totalCredits: Number(k.totalCredits),
        usedCredits: Number(k.usedCredits),
        redeemedAt: k.redeemedAt,
      })),
      total,
      page,
      pageSize,
    },
  });
}
