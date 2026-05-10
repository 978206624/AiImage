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
  const skip = (page - 1) * pageSize;

  const [images, total] = await Promise.all([
    prisma.galleryImage.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.galleryImage.count(),
  ]);

  return NextResponse.json({
    success: true,
    data: { images, total, page, pageSize },
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
    const { imageUrl, prompt, modelTag, styleTag } = await request.json();

    if (!imageUrl || !modelTag || !styleTag) {
      return NextResponse.json(
        { success: false, error: "图片URL、模型标签、风格标签为必填" },
        { status: 400 }
      );
    }

    const image = await prisma.galleryImage.create({
      data: { imageUrl, prompt, modelTag, styleTag },
    });

    return NextResponse.json({ success: true, data: image });
  } catch {
    return NextResponse.json(
      { success: false, error: "创建失败" },
      { status: 500 }
    );
  }
}
