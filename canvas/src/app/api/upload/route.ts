import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateUploadCredentials } from "@/lib/oss";

export async function POST(request: Request) {
  try {
    const { key, filename } = await request.json();

    if (!key || !filename) {
      return NextResponse.json(
        { success: false, error: "缺少参数" },
        { status: 400 }
      );
    }

    const apiKey = await prisma.apiKey.findUnique({
      where: { key: key.trim() },
      select: { status: true },
    });

    if (!apiKey || apiKey.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Key 无效" },
        { status: 403 }
      );
    }

    const credentials = await generateUploadCredentials("ref-temp", filename);

    return NextResponse.json({ success: true, data: credentials });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取上传凭证失败";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
