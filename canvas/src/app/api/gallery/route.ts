import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GPT_IMAGE_DISPLAY_NAME, GPT_IMAGE_MODEL_TAG_VALUES } from "@/lib/constants";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const model = searchParams.get("model");
  const style = searchParams.get("style");
  const featured = searchParams.get("featured");
  const categoryIdParam = searchParams.get("categoryId");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = { isPublished: true };

  if (model) {
    if (model === GPT_IMAGE_DISPLAY_NAME || model === "GPT-4o Image") {
      where.OR = GPT_IMAGE_MODEL_TAG_VALUES.map((modelTag) => ({ modelTag }));
    } else {
      where.modelTag = model;
    }
  }
  if (style) where.styleTag = style;
  if (featured === "true") where.isFeatured = true;
  if (categoryIdParam) {
    const categoryId = parseInt(categoryIdParam);
    if (!Number.isNaN(categoryId)) where.categoryId = categoryId;
  }

  const [images, total] = await Promise.all([
    prisma.galleryImage.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        imageUrl: true,
        prompt: true,
        modelTag: true,
        styleTag: true,
        title: true,
        width: true,
        height: true,
        isFeatured: true,
        createdAt: true,
        category: { select: { id: true, name: true } },
      },
    }),
    prisma.galleryImage.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: { images, total, page, pageSize },
  });
}
