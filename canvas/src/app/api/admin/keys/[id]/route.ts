import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

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

  const { id } = await params;
  const keyId = parseInt(id);

  if (isNaN(keyId)) {
    return NextResponse.json(
      { success: false, error: "无效 ID" },
      { status: 400 }
    );
  }

  try {
    const { status } = await request.json();

    if (status !== "active" && status !== "disabled") {
      return NextResponse.json(
        { success: false, error: "状态值无效" },
        { status: 400 }
      );
    }

    const updated = await prisma.apiKey.update({
      where: { id: keyId },
      data: { status },
    });

    return NextResponse.json({
      success: true,
      data: { id: updated.id, status: updated.status },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "操作失败" },
      { status: 500 }
    );
  }
}
