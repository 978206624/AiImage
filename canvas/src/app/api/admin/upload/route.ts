import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { generateUploadCredentials } from "@/lib/oss";

export async function POST(request: Request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "未授权" },
      { status: 401 }
    );
  }

  try {
    const { filename, dir = "gallery" } = await request.json();

    if (!filename) {
      return NextResponse.json(
        { success: false, error: "缺少文件名" },
        { status: 400 }
      );
    }

    const allowedDirs = ["gallery", "templates", "presets", "temp"];
    if (!allowedDirs.includes(dir)) {
      return NextResponse.json(
        { success: false, error: "无效的上传目录" },
        { status: 400 }
      );
    }

    const credentials = await generateUploadCredentials(dir, filename);

    return NextResponse.json({ success: true, data: credentials });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "生成上传凭证失败";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
