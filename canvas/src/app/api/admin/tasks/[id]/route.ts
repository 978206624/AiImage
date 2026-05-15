import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

async function requireAdmin() {
  const session = await verifySession();
  if (!session || session.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const taskId = parseInt(id);

  if (Number.isNaN(taskId)) {
    return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
  }

  let body: { action?: string };
  try {
    body = (await request.json()) as { action?: string };
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { action } = body;

  if (!action) {
    return NextResponse.json({ success: false, error: "Action is required" }, { status: 400 });
  }

  try {
    if (action === "retry") {
      await prisma.imageTask.update({
        where: { id: taskId },
        data: {
          status: "pending",
          failReason: null,
          progress: 0,
          lockedBy: null,
          lockExpiresAt: null,
          attemptCount: 0,
          nextRunAt: new Date(),
          startedAt: null,
          finishedAt: null,
        },
      });
    } else if (action === "reset") {
      await prisma.imageTask.update({
        where: { id: taskId },
        data: {
          status: "pending",
          lockedBy: null,
          lockExpiresAt: null,
          nextRunAt: null,
          startedAt: null,
        },
      });
    } else if (action === "fail") {
      const task = await prisma.imageTask.findUnique({
        where: { id: taskId },
        select: { userId: true, creditsLocked: true, refunded: true },
      });

      if (task && !task.refunded) {
        await prisma.$transaction([
          prisma.imageTask.update({
            where: { id: taskId },
            data: {
              status: "failed",
              failReason: "Manual admin action",
              refunded: true,
              finishedAt: new Date(),
            },
          }),
          prisma.user.update({
            where: { id: task.userId },
            data: { balance: { increment: task.creditsLocked } },
          }),
        ]);
      } else {
        await prisma.imageTask.update({
          where: { id: taskId },
          data: {
            status: "failed",
            failReason: "Manual admin action",
            finishedAt: new Date(),
          },
        });
      }
    } else {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Task action failed:", error);
    return NextResponse.json({ success: false, error: "Action failed" }, { status: 500 });
  }
}
