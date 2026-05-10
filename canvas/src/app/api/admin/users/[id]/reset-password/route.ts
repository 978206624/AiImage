import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { generateTempPassword } from "@/lib/temp-password";

export async function POST(
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

  const { id } = await params;
  const userId = parseInt(id);
  if (!Number.isFinite(userId) || userId <= 0) {
    return NextResponse.json(
      { success: false, error: "无效 ID" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json(
      { success: false, error: "用户不存在" },
      { status: 404 }
    );
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    }),
    prisma.adminUserAuditLog.create({
      data: {
        adminId: 0,
        targetUserId: userId,
        action: "password_reset",
        payload: JSON.stringify({ method: "temp_password" }),
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: { tempPassword },
  });
}
