import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/c-auth";

const CODE_REGEX = /^CV-[A-Z0-9]{16}$/;

export async function POST(request: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: e.message },
        { status: e.statusCode }
      );
    }
    throw e;
  }

  try {
    const body = await request.json();
    const code: string = (body?.code ?? "").trim().toUpperCase();

    if (!CODE_REGEX.test(code)) {
      return NextResponse.json(
        { success: false, error: "充值码格式不正确" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const apiKey = await tx.apiKey.findUnique({
        where: { key: code },
        select: {
          id: true,
          status: true,
          redeemedBy: true,
          totalCredits: true,
          usedCredits: true,
        },
      });

      if (!apiKey) {
        return { ok: false as const, status: 404, error: "充值码不存在" };
      }
      if (apiKey.redeemedBy !== null) {
        return { ok: false as const, status: 410, error: "充值码已被兑换" };
      }
      if (apiKey.status === "disabled") {
        return { ok: false as const, status: 410, error: "充值码已被禁用" };
      }
      if (apiKey.status !== "active") {
        return { ok: false as const, status: 410, error: "充值码不可用" };
      }

      const remaining = new Prisma.Decimal(apiKey.totalCredits).minus(
        apiKey.usedCredits
      );
      if (remaining.lessThanOrEqualTo(0)) {
        return {
          ok: false as const,
          status: 410,
          error: "充值码无剩余积分",
        };
      }

      await tx.apiKey.update({
        where: { id: apiKey.id },
        data: {
          redeemedBy: user.id,
          redeemedAt: new Date(),
          status: "redeemed",
        },
      });

      const updated = await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { increment: remaining },
        },
        select: { balance: true },
      });

      return {
        ok: true as const,
        addedCredits: Number(remaining),
        newBalance: Number(updated.balance),
      };
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        addedCredits: result.addedCredits,
        newBalance: result.newBalance,
      },
    });
  } catch (error) {
    console.error("[POST /api/account/redeem]", error);
    return NextResponse.json(
      { success: false, error: "兑换失败，请稍后重试" },
      { status: 500 }
    );
  }
}
