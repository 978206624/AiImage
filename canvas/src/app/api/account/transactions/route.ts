import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/c-auth";

function maskCode(code: string): string {
  if (code.length <= 9) return code;
  return `${code.slice(0, 5)}***${code.slice(-4)}`;
}

export async function GET(request: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: e.message },
        { status: e.statusCode }
      );
    }
    throw e;
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "topup";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10) || 20)
  );
  const skip = (page - 1) * pageSize;

  if (type === "topup") {
    const [rows, total] = await Promise.all([
      prisma.apiKey.findMany({
        where: { redeemedBy: user.id },
        orderBy: { redeemedAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          key: true,
          totalCredits: true,
          usedCredits: true,
          redeemedAt: true,
        },
      }),
      prisma.apiKey.count({ where: { redeemedBy: user.id } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: rows.map((r) => ({
          id: r.id,
          codeMasked: maskCode(r.key),
          addedCredits:
            Number(r.totalCredits) - Number(r.usedCredits),
          redeemedAt: r.redeemedAt,
        })),
        page,
        pageSize,
        total,
        hasMore: skip + rows.length < total,
      },
    });
  }

  if (type === "consume") {
    const [rows, total] = await Promise.all([
      prisma.usageRecord.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          creditsUsed: true,
          promptSummary: true,
          imageUrl: true,
          createdAt: true,
        },
      }),
      prisma.usageRecord.count({ where: { userId: user.id } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: rows.map((r) => ({
          id: r.id,
          creditsUsed: Number(r.creditsUsed),
          promptSummary: r.promptSummary,
          imageUrl: r.imageUrl,
          createdAt: r.createdAt,
        })),
        page,
        pageSize,
        total,
        hasMore: skip + rows.length < total,
      },
    });
  }

  return NextResponse.json(
    { success: false, error: "type 必须为 topup 或 consume" },
    { status: 400 }
  );
}
