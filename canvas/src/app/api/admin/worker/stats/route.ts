import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { getAllCircuitBreakers } from "@/lib/queue/circuit-breaker";

async function requireAdmin() {
  const session = await verifySession();
  if (!session || session.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);

  const [
    processingTasks,
    pendingTasks,
    failedTasks24h,
    stuckTasks,
  ] = await Promise.all([
    prisma.imageTask.count({
      where: { status: "processing", source: "worker" },
    }),
    prisma.imageTask.count({
      where: { status: "pending", source: "worker" },
    }),
    prisma.imageTask.count({
      where: {
        status: "failed",
        source: "worker",
        updatedAt: { gte: oneDayAgo },
      },
    }),
    prisma.imageTask.count({
      where: {
        status: "processing",
        lockExpiresAt: { lt: sixtySecondsAgo },
      },
    }),
  ]);

  const circuitBreakers = getAllCircuitBreakers().map((cb) => ({
    provider: cb.provider,
    isOpen: cb.isOpen,
    failureCount: cb.failureCount,
  }));

  return NextResponse.json({
    success: true,
    data: {
      activeWorkers: 0,
      processingTasks,
      pendingTasks,
      failedTasks24h,
      stuckTasks,
      circuitBreakers,
    },
  });
}
