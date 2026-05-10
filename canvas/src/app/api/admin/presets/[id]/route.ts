import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "未授权" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const presetId = parseInt(id);

  if (isNaN(presetId)) {
    return NextResponse.json(
      { success: false, error: "无效 ID" },
      { status: 400 }
    );
  }

  try {
    const { name, description, coverImageUrl, promptPrefix, sortOrder } =
      await request.json();

    if (!name?.trim() || !promptPrefix?.trim()) {
      return NextResponse.json(
        { success: false, error: "预设名和 prompt 前缀为必填" },
        { status: 400 }
      );
    }

    const preset = await prisma.stylePreset.update({
      where: { id: presetId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        coverImageUrl: coverImageUrl || null,
        promptPrefix: promptPrefix.trim(),
        sortOrder: sortOrder ?? 0,
      },
    });

    return NextResponse.json({ success: true, data: preset });
  } catch {
    return NextResponse.json(
      { success: false, error: "更新失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "未授权" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const presetId = parseInt(id);

  if (isNaN(presetId)) {
    return NextResponse.json(
      { success: false, error: "无效 ID" },
      { status: 400 }
    );
  }

  try {
    await prisma.stylePreset.delete({ where: { id: presetId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "删除失败" },
      { status: 500 }
    );
  }
}
