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

  const presets = await prisma.stylePreset.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ success: true, data: presets });
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
    const { name, description, coverImageUrl, promptPrefix, sortOrder } =
      await request.json();

    if (!name?.trim() || !promptPrefix?.trim()) {
      return NextResponse.json(
        { success: false, error: "预设名和 prompt 前缀为必填" },
        { status: 400 }
      );
    }

    const preset = await prisma.stylePreset.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        coverImageUrl: coverImageUrl || null,
        promptPrefix: promptPrefix.trim(),
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json({ success: true, data: preset });
  } catch {
    return NextResponse.json(
      { success: false, error: "创建失败" },
      { status: 500 }
    );
  }
}
