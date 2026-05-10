import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { sendTestEmail } from "@/lib/mailer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "未授权" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const to = typeof body?.to === "string" ? body.to.trim() : "";
  if (!EMAIL_RE.test(to)) {
    return NextResponse.json(
      { success: false, error: "收件人邮箱格式不合法" },
      { status: 400 }
    );
  }

  try {
    await sendTestEmail(to);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/admin/settings/test-email]", error);
    const message =
      error instanceof Error ? error.message : "发送失败";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
