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
  const imageId = parseInt(id);

  try {
    const { imageUrl, prompt, modelTag, styleTag } = await request.json();

    const image = await prisma.galleryImage.update({
      where: { id: imageId },
      data: { imageUrl, prompt, modelTag, styleTag },
    });

    return NextResponse.json({ success: true, data: image });
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
  const imageId = parseInt(id);

  try {
    await prisma.galleryImage.delete({ where: { id: imageId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "删除失败" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "未授权" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const imageId = parseInt(id);

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (typeof body.isPublished === "boolean") {
      data.isPublished = body.isPublished;
    }
    if (typeof body.isFeatured === "boolean") {
      data.isFeatured = body.isFeatured;
    }
    if (typeof body.sortOrder === "number") {
      data.sortOrder = body.sortOrder;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, error: "无有效更新字段" },
        { status: 400 }
      );
    }

    const image = await prisma.galleryImage.update({
      where: { id: imageId },
      data,
    });

    return NextResponse.json({ success: true, data: image });
  } catch {
    return NextResponse.json(
      { success: false, error: "更新失败" },
      { status: 500 }
    );
  }
}
