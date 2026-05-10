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
  const templateId = parseInt(id);

  if (isNaN(templateId)) {
    return NextResponse.json(
      { success: false, error: "无效 ID" },
      { status: 400 }
    );
  }

  try {
    const { name, prompt, categoryId, coverImageUrl, sortOrder } =
      await request.json();

    if (!name?.trim() || !prompt?.trim() || !categoryId) {
      return NextResponse.json(
        { success: false, error: "模板名、提示词、分类为必填" },
        { status: 400 }
      );
    }

    const template = await prisma.promptTemplate.update({
      where: { id: templateId },
      data: {
        name: name.trim(),
        prompt: prompt.trim(),
        categoryId,
        coverImageUrl: coverImageUrl || null,
        sortOrder: sortOrder ?? 0,
      },
    });

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error("[PUT /api/admin/templates/[id]]", error);
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
  const templateId = parseInt(id);

  if (isNaN(templateId)) {
    return NextResponse.json(
      { success: false, error: "无效 ID" },
      { status: 400 }
    );
  }

  try {
    await prisma.promptTemplate.delete({ where: { id: templateId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/templates/[id]]", error);
    return NextResponse.json(
      { success: false, error: "删除失败" },
      { status: 500 }
    );
  }
}
