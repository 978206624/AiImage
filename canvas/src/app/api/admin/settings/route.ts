import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { invalidateSettingsCache } from "@/lib/system-settings";
import { hashPassword } from "@/lib/password";

const ADMIN_USERNAME_PATTERN = /^[a-zA-Z0-9_]{4,32}$/;
const HIDDEN_KEYS = new Set(["admin_password"]);

export async function GET() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "未授权" },
      { status: 401 }
    );
  }

  const settings = await prisma.systemSetting.findMany();
  const data: Record<string, string> = {};
  for (const s of settings) {
    if (HIDDEN_KEYS.has(s.key)) continue;
    data[s.key] = s.value;
  }

  return NextResponse.json({ success: true, data });
}

export async function PUT(request: Request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "未授权" },
      { status: 401 }
    );
  }

  try {
    const body: Record<string, unknown> = await request.json();
    const writes: Array<{ key: string; value: string }> = [];

    for (const [key, raw] of Object.entries(body)) {
      const value = typeof raw === "string" ? raw : "";

      if (key === "admin_password") {
        if (!value) continue;
        const hash = await hashPassword(value);
        writes.push({ key, value: hash });
        continue;
      }

      if (key === "admin_username") {
        if (!value) continue;
        if (!ADMIN_USERNAME_PATTERN.test(value)) {
          return NextResponse.json(
            {
              success: false,
              error: "管理员账号格式不正确（4-32 字符，仅字母数字下划线）",
            },
            { status: 400 }
          );
        }
        writes.push({ key, value });
        continue;
      }

      writes.push({ key, value });
    }

    if (writes.length === 0) {
      return NextResponse.json({ success: true });
    }

    const operations = writes.map((w) =>
      prisma.systemSetting.upsert({
        where: { key: w.key },
        update: { value: w.value },
        create: { key: w.key, value: w.value },
      })
    );

    await prisma.$transaction(operations);

    invalidateSettingsCache(writes.map((w) => w.key));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PUT /api/admin/settings]", error);
    return NextResponse.json(
      { success: false, error: "保存失败" },
      { status: 500 }
    );
  }
}
