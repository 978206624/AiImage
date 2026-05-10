import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: Request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "未授权" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const status = searchParams.get("status") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") || "20") || 20)
  );
  const skip = (page - 1) * pageSize;

  const where: Prisma.UserWhereInput = {};
  if (q) where.email = { contains: q };
  if (status === "active" || status === "banned") where.status = status;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        email: true,
        balance: true,
        emailVerified: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  const ids = users.map((u) => u.id);
  const consumed = ids.length
    ? await prisma.usageRecord.groupBy({
        by: ["userId"],
        where: { userId: { in: ids } },
        _sum: { creditsUsed: true },
      })
    : [];
  const consumedMap = new Map<number, number>(
    consumed.map((c) => [c.userId as number, Number(c._sum.creditsUsed ?? 0)])
  );

  return NextResponse.json({
    success: true,
    data: {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        balance: Number(u.balance),
        totalConsumed: consumedMap.get(u.id) ?? 0,
        emailVerified: u.emailVerified,
        status: u.status,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
      })),
      total,
      page,
      pageSize,
    },
  });
}
