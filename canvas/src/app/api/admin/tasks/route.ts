import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

async function requireAdmin() {
  const session = await verifySession();
  if (!session || session.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20") || 20));
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (status && ["pending", "processing", "submitted", "completed", "failed"].includes(status)) {
    where.status = status;
  }

  const [tasks, total] = await Promise.all([
    prisma.imageTask.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        userId: true,
        groupId: true,
        status: true,
        provider: true,
        model: true,
        promptSummary: true,
        aspectRatio: true,
        quality: true,
        size: true,
        creditsLocked: true,
        progress: true,
        failReason: true,
        upstreamRaw: true,
        attemptCount: true,
        source: true,
        createdAt: true,
        updatedAt: true,
        startedAt: true,
        finishedAt: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    }),
    prisma.imageTask.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      tasks,
      total,
      page,
      pageSize,
    },
  });
}
