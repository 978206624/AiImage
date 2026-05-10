import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (categoryId) where.categoryId = parseInt(categoryId);

  const [templates, total] = await Promise.all([
    prisma.promptTemplate.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        prompt: true,
        coverImageUrl: true,
        sortOrder: true,
        category: { select: { id: true, name: true } },
      },
    }),
    prisma.promptTemplate.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: { templates, total, page, pageSize },
  });
}
