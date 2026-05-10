import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { probeImageDimensions } from "@/lib/image-dimensions";

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

  if (isNaN(imageId)) {
    return NextResponse.json(
      { success: false, error: "无效 ID" },
      { status: 400 }
    );
  }

  try {
    const { imageUrl, prompt, modelTag, styleTag } = await request.json();

    const existing = await prisma.galleryImage.findUnique({
      where: { id: imageId },
      select: { imageUrl: true },
    });

    const data: Prisma.GalleryImageUpdateInput = {
      imageUrl,
      prompt,
      modelTag,
      styleTag,
    };

    if (existing && imageUrl && imageUrl !== existing.imageUrl) {
      const dims = await probeImageDimensions(imageUrl);
      data.width = dims?.width ?? null;
      data.height = dims?.height ?? null;
    }

    const image = await prisma.galleryImage.update({
      where: { id: imageId },
      data,
    });

    return NextResponse.json({ success: true, data: image });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "图片不存在" },
        { status: 404 }
      );
    }
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

  if (isNaN(imageId)) {
    return NextResponse.json(
      { success: false, error: "无效 ID" },
      { status: 400 }
    );
  }

  try {
    await prisma.galleryImage.delete({ where: { id: imageId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "图片不存在" },
        { status: 404 }
      );
    }
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

  if (isNaN(imageId)) {
    return NextResponse.json(
      { success: false, error: "无效 ID" },
      { status: 400 }
    );
  }

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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "图片不存在" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: "更新失败" },
      { status: 500 }
    );
  }
}
