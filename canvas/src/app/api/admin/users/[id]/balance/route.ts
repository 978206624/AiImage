import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";

export async function POST(
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

  const body = await request.json().catch(() => null);
  const deltaRaw = body?.delta;
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

  const delta = Number(deltaRaw);
  if (!Number.isFinite(delta) || delta === 0) {
    return NextResponse.json(
      { success: false, error: "delta 必须是非零数字" },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });
      if (!user) throw new Error("USER_NOT_FOUND");

      const before = new Prisma.Decimal(user.balance);
      const after = before.plus(delta);
      if (after.lessThan(0)) throw new Error("BALANCE_BELOW_ZERO");

      const updated = await tx.user.update({
        where: { id: userId },
        data: { balance: after },
        select: { balance: true },
      });
      await tx.adminUserAuditLog.create({
        data: {
          adminId: 0,
          targetUserId: userId,
          action: "balance_adjust",
          payload: JSON.stringify({
            delta,
            reason,
            before: before.toFixed(2),
            after: after.toFixed(2),
          }),
        },
      });

      return Number(updated.balance);
    });

    return NextResponse.json({
      success: true,
      data: { balance: result },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 404 }
      );
    }
    if (error instanceof Error && error.message === "BALANCE_BELOW_ZERO") {
      return NextResponse.json(
        { success: false, error: "扣减后余额不能为负" },
        { status: 400 }
      );
    }
    console.error("[POST /api/admin/users/[id]/balance]", error);
    return NextResponse.json(
      { success: false, error: "操作失败" },
      { status: 500 }
    );
  }
}
