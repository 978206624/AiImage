import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { generateKeys } from "@/lib/key-generator";

export async function GET(request: Request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "未授权" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const skip = (page - 1) * pageSize;

  const [keys, total] = await Promise.all([
    prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.apiKey.count(),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      keys: keys.map((k) => ({
        id: k.id,
        key: k.key,
        totalCredits: Number(k.totalCredits),
        usedCredits: Number(k.usedCredits),
        remainingCredits: Number(k.totalCredits) - Number(k.usedCredits),
        status: k.status,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      })),
      total,
      page,
      pageSize,
    },
  });
}

export async function POST(request: Request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "未授权" },
      { status: 401 }
    );
  }

  try {
    const { count, credits } = await request.json();

    if (!count || !credits || count < 1 || count > 100 || credits <= 0) {
      return NextResponse.json(
        { success: false, error: "参数无效：数量 1-100，积分 > 0" },
        { status: 400 }
      );
    }

    const keyValues = generateKeys(count);

    const created = await prisma.$transaction(
      keyValues.map((key) =>
        prisma.apiKey.create({
          data: { key, totalCredits: credits },
        })
      )
    );

    return NextResponse.json({
      success: true,
      data: {
        keys: created.map((k) => ({
          id: k.id,
          key: k.key,
          totalCredits: Number(k.totalCredits),
        })),
      },
    });
  } catch (error) {
    console.error("[POST /api/admin/keys]", error);
    return NextResponse.json(
      { success: false, error: "生成失败" },
      { status: 500 }
    );
  }
}
