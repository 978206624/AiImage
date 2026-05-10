import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/c-auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { validatePassword } from "@/lib/validation";

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
    const oldPassword: string = body?.oldPassword ?? "";
    const newPassword: string = body?.newPassword ?? "";

    if (!oldPassword) {
      return NextResponse.json(
        { success: false, error: "请输入旧密码" },
        { status: 400 }
      );
    }

    const newErr = validatePassword(newPassword);
    if (newErr) {
      return NextResponse.json(
        { success: false, error: newErr },
        { status: 400 }
      );
    }

    if (oldPassword === newPassword) {
      return NextResponse.json(
        { success: false, error: "新密码不能与旧密码相同" },
        { status: 400 }
      );
    }

    const record = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!record) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 404 }
      );
    }

    const ok = await verifyPassword(oldPassword, record.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "旧密码不正确" },
        { status: 401 }
      );
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/account/change-password]", error);
    return NextResponse.json(
      { success: false, error: "修改失败，请稍后重试" },
      { status: 500 }
    );
  }
}
