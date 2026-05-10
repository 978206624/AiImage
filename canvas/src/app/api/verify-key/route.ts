import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { key } = await request.json();

    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { valid: false, error: "请提供 Key" },
        { status: 400 }
      );
    }

    const apiKey = await prisma.apiKey.findUnique({
      where: { key: key.trim() },
      select: {
        id: true,
        status: true,
        totalCredits: true,
        usedCredits: true,
      },
    });

    if (!apiKey) {
      return NextResponse.json(
        { valid: false, error: "Key 无效" },
        { status: 404 }
      );
    }

    if (apiKey.status !== "active") {
      return NextResponse.json(
        { valid: false, error: "Key 已禁用" },
        { status: 403 }
      );
    }

    const remaining = Number(apiKey.totalCredits) - Number(apiKey.usedCredits);

    return NextResponse.json({
      valid: true,
      totalCredits: Number(apiKey.totalCredits),
      remainingCredits: remaining,
    });
  } catch (error) {
    console.error("verify-key error:", error);
    return NextResponse.json(
      { valid: false, error: "验证失败" },
      { status: 500 }
    );
  }
}
