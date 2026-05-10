import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

async function parseId(params: Promise<{ id: string }>) {
  const { id } = await params;
  const userId = parseInt(id);
  return Number.isFinite(userId) && userId > 0 ? userId : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "未授权" },
      { status: 401 }
    );
  }
  const userId = await parseId(params);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "无效 ID" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      balance: true,
      emailVerified: true,
      hasReceivedBonus: true,
      registerIp: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });
  if (!user) {
    return NextResponse.json(
      { success: false, error: "用户不存在" },
      { status: 404 }
    );
  }

  const [consumedAgg, auditLogs] = await Promise.all([
    prisma.usageRecord.aggregate({
      where: { userId },
      _sum: { creditsUsed: true },
    }),
    prisma.adminUserAuditLog.findMany({
      where: { targetUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        balance: Number(user.balance),
        totalConsumed: Number(consumedAgg._sum.creditsUsed ?? 0),
        emailVerified: user.emailVerified,
        hasReceivedBonus: user.hasReceivedBonus,
        registerIp: user.registerIp,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      auditLogs: auditLogs.map((a) => ({
        id: a.id,
        action: a.action,
        payload: a.payload,
        createdAt: a.createdAt,
      })),
    },
  });
}

export async function PATCH(
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
  const userId = await parseId(params);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "无效 ID" },
      { status: 400 }
    );
  }

  const { status } = await request.json();
  if (status !== "active" && status !== "banned") {
    return NextResponse.json(
      { success: false, error: "状态值无效" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });
  if (!user) {
    return NextResponse.json(
      { success: false, error: "用户不存在" },
      { status: 404 }
    );
  }

  if (user.status === status) {
    return NextResponse.json({ success: true, data: { status } });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { status },
    }),
    prisma.adminUserAuditLog.create({
      data: {
        adminId: 0,
        targetUserId: userId,
        action: "status_change",
        payload: JSON.stringify({ from: user.status, to: status }),
      },
    }),
  ]);

  return NextResponse.json({ success: true, data: { status } });
}
