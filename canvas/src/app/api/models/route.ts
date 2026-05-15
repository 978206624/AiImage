import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const models = await prisma.modelConfig.findMany({
      where: {
        enabled: true,
        userSelectable: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        modelId: true,
        displayName: true,
        provider: true,
        userCreditCost: true,
      },
    });

    return NextResponse.json({
      success: true,
      models: models.map((m) => ({
        id: m.modelId,
        name: m.displayName,
        provider: m.provider,
        creditCost: Number(m.userCreditCost),
      })),
    });
  } catch (error) {
    console.error("[api/models] failed:", error);
    return NextResponse.json({ success: false, models: [] });
  }
}
