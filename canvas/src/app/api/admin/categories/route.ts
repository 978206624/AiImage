import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function GET() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "未授权" },
      { status: 401 }
    );
  }

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ success: true, data: categories });
}

export async function POST(request: Request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "未授权" },
      { status: 401 }
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

    const category = await prisma.category.create({
      data: { name: name.trim(), sortOrder: sortOrder || 0 },
    });

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error("[POST /api/admin/categories]", error);
    return NextResponse.json(
      { success: false, error: "创建失败" },
      { status: 500 }
    );
  }
}
