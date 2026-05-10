import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createUserSession } from "@/lib/c-session";
import { getSetting } from "@/lib/system-settings";
import { getClientIp } from "@/lib/get-ip";
import {
  validateEmail,
  validatePassword,
  normalizeEmail,
  checkRegistrationRateLimit,
} from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const password: string = body?.password ?? "";
    const rawEmail: string = body?.email ?? "";

    const emailErr = validateEmail(rawEmail);
    if (emailErr) {
      return NextResponse.json(
        { success: false, error: emailErr },
        { status: 400 }
      );
    }

    const passwordErr = validatePassword(password);
    if (passwordErr) {
      return NextResponse.json(
        { success: false, error: passwordErr },
        { status: 400 }
      );
    }

    const email = normalizeEmail(rawEmail);
    const ip = getClientIp(request);

    const allowed = await checkRegistrationRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "注册过于频繁，请 24 小时后再试" },
        { status: 429 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "该邮箱已注册" },
        { status: 409 }
      );
    }

    const bonusRaw = await getSetting(
      "register_bonus_credits",
      "REGISTER_BONUS_CREDITS",
      "0.21"
    );
    const bonus = parseFloat(bonusRaw ?? "0.21");
    const initialBalance =
      Number.isFinite(bonus) && bonus >= 0 ? bonus.toFixed(2) : "0.21";

    const passwordHash = await hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          passwordHash,
          balance: new Prisma.Decimal(initialBalance),
          emailVerified: true,
          hasReceivedBonus: true,
          registerIp: ip,
          status: "active",
          lastLoginAt: new Date(),
        },
        select: { id: true, email: true, balance: true },
      });
      await tx.registrationAttempt.create({ data: { ip } });
      return created;
    });

    await createUserSession(user.id, user.email);

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        balance: Number(user.balance),
      },
    });
  } catch (error) {
    console.error("[POST /api/auth/register]", error);
    return NextResponse.json(
      { success: false, error: "注册失败，请稍后重试" },
      { status: 500 }
    );
  }
}
