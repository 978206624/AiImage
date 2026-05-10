import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { invalidateSettingsCache } from "@/lib/system-settings";

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
    const body: Record<string, string> = await request.json();

    const entries = Object.entries(body);
    const operations = entries.map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    );

    await prisma.$transaction(operations);

    invalidateSettingsCache(entries.map(([k]) => k));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PUT /api/admin/settings]", error);
    return NextResponse.json(
      { success: false, error: "保存失败" },
      { status: 500 }
    );
  }
}
