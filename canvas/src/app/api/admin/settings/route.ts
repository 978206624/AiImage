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

    const operations = Object.entries(body).map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    );

    await prisma.$transaction(operations);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PUT /api/admin/settings]", error);
    return NextResponse.json(
      { success: false, error: "保存失败" },
      { status: 500 }
    );
  }
}
