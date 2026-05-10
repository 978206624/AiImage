import { NextResponse } from "next/server";
import { generateUploadCredentials } from "@/lib/oss";
import { requireUser, AuthError } from "@/lib/c-auth";

export async function POST(request: Request) {
  try {
    await requireUser();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: e.message, code: e.code },
        { status: e.statusCode }
      );
    }
    throw e;
  }

  try {
    const { filename } = await request.json();

    if (!filename) {
      return NextResponse.json(
        { success: false, error: "缺少文件名" },
        { status: 400 }
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
