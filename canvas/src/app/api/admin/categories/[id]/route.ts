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
  const categoryId = parseInt(id);

  if (isNaN(categoryId)) {
    return NextResponse.json(
      { success: false, error: "无效 ID" },
      { status: 400 }
    );
  }

  try {
    const { name, sortOrder } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "分类名称为必填" },
        { status: 400 }
      );
    }

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: { name: name.trim(), sortOrder: sortOrder ?? 0 },
    });

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error("[PUT /api/admin/categories/[id]]", error);
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
  const categoryId = parseInt(id);

  if (isNaN(categoryId)) {
    return NextResponse.json(
      { success: false, error: "无效 ID" },
      { status: 400 }
    );
  }

  try {
    const templatesCount = await prisma.promptTemplate.count({
      where: { categoryId },
    });

    if (templatesCount > 0) {
      return NextResponse.json(
        { success: false, error: `该分类下有 ${templatesCount} 个模板，请先删除或移动` },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id: categoryId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/categories/[id]]", error);
    return NextResponse.json(
      { success: false, error: "删除失败" },
      { status: 500 }
    );
  }
}
