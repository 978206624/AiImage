import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { success: false, error: "密码不能为空" },
        { status: 400 }
      );
    }

    let adminPassword = process.env.ADMIN_PASSWORD || "REDACTED";

    const setting = await prisma.systemSetting.findUnique({
      where: { key: "admin_password" },
    });
    if (setting) {
      adminPassword = setting.value;
    }

    if (password !== adminPassword) {
      return NextResponse.json(
        { success: false, error: "密码错误" },
        { status: 401 }
      );
    }

    await createSession();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/admin/auth]", error);
    return NextResponse.json(
      { success: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
