import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const presets = await prisma.stylePreset.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      description: true,
      coverImageUrl: true,
      promptPrefix: true,
    },
  });

  return NextResponse.json({ success: true, data: presets });
}
