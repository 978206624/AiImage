import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { probeImageDimensions } from "@/lib/image-dimensions";

export async function POST() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "未授权" },
      { status: 401 }
    );
  }

  const targets = await prisma.galleryImage.findMany({
    where: { OR: [{ width: null }, { height: null }] },
    select: { id: true, imageUrl: true },
  });

  let ok = 0;
  let fail = 0;
  const failures: Array<{ id: number; imageUrl: string }> = [];

  for (const t of targets) {
    const dims = await probeImageDimensions(t.imageUrl);
    if (dims) {
      await prisma.galleryImage.update({
        where: { id: t.id },
        data: { width: dims.width, height: dims.height },
      });
      ok++;
    } else {
      fail++;
      failures.push({ id: t.id, imageUrl: t.imageUrl });
    }
  }

  return NextResponse.json({
    success: true,
    data: { total: targets.length, ok, fail, failures },
  });
}
