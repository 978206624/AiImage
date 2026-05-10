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
  const keyId = parseInt(id);

  if (isNaN(keyId)) {
    return NextResponse.json(
      { success: false, error: "无效 ID" },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const skip = (page - 1) * pageSize;

  const [records, total] = await Promise.all([
    prisma.usageRecord.findMany({
      where: { apiKeyId: keyId },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.usageRecord.count({ where: { apiKeyId: keyId } }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      records: records.map((r) => ({
        id: r.id,
        creditsUsed: Number(r.creditsUsed),
        promptSummary: r.promptSummary,
        createdAt: r.createdAt,
      })),
      total,
      page,
      pageSize,
    },
  });
}
