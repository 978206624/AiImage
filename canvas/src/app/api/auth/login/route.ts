import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createUserSession } from "@/lib/c-session";
import { validateEmail, normalizeEmail } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const password: string = body?.password ?? "";
    const rawEmail: string = body?.email ?? "";

    if (validateEmail(rawEmail) || !password) {
      return NextResponse.json(
        { success: false, error: "邮箱或密码不正确" },
        { status: 400 }
      );
    }

    const email = normalizeEmail(rawEmail);
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        balance: true,
        status: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "邮箱或密码不正确" },
        { status: 401 }
      );
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "邮箱或密码不正确" },
        { status: 401 }
      );
    }

    if (user.status === "banned") {
      return NextResponse.json(
        { success: false, error: "账号已被封禁，请联系客服" },
        { status: 403 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
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
    console.error("[POST /api/auth/login]", error);
    return NextResponse.json(
      { success: false, error: "登录失败，请稍后重试" },
      { status: 500 }
    );
  }
}
