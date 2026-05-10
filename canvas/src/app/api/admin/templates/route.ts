import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "未授权" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const categoryId = searchParams.get("categoryId");
  const skip = (page - 1) * pageSize;

  const where = categoryId ? { categoryId: parseInt(categoryId) } : {};

  const [templates, total] = await Promise.all([
    prisma.promptTemplate.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.promptTemplate.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: { templates, total, page, pageSize },
  });
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
    const { name, prompt, categoryId, coverImageUrl, sortOrder } =
      await request.json();

    if (!name?.trim() || !prompt?.trim() || !categoryId) {
      return NextResponse.json(
        { success: false, error: "模板名、提示词、分类为必填" },
        { status: 400 }
      );
    }

    const template = await prisma.promptTemplate.create({
      data: {
        name: name.trim(),
        prompt: prompt.trim(),
        categoryId,
        coverImageUrl: coverImageUrl || null,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error("[POST /api/admin/templates]", error);
    return NextResponse.json(
      { success: false, error: "创建失败" },
      { status: 500 }
    );
  }
}
