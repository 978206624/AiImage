import "server-only";
import { prisma } from "../prisma";
import { Prisma } from "@/generated/prisma/client";

const LOCK_TIMEOUT_SECONDS = 60;

export async function claimTask(workerId: string): Promise<number | null> {
  try {
    const result = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM image_tasks
      WHERE status = 'pending'
        AND (next_run_at IS NULL OR next_run_at <= NOW())
        AND (lock_expires_at IS NULL OR lock_expires_at < NOW())
        AND attempt_count < COALESCE(max_attempts, 2)
        AND source = 'worker'
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;

    if (!result || result.length === 0) {
      return null;
    }

    const taskId = result[0].id;

    const lockExpiresAt = new Date(Date.now() + LOCK_TIMEOUT_SECONDS * 1000);

    await prisma.imageTask.update({
      where: { id: taskId },
      data: {
        status: "processing",
        lockedBy: workerId,
        lockExpiresAt: lockExpiresAt,
        attemptCount: { increment: 1 },
        startedAt: new Date(),
      },
    });

    return taskId;
  } catch (error) {
    console.error("[claimTask] failed:", error);
    return null;
  }
}

export async function releaseTask(taskId: number, workerId: string): Promise<void> {
  try {
    await prisma.imageTask.updateMany({
      where: {
        id: taskId,
        lockedBy: workerId,
        status: "processing",
      },
      data: {
        status: "pending",
        lockedBy: null,
        lockExpiresAt: null,
        nextRunAt: new Date(Date.now() + 30 * 1000),
      },
    });
  } catch (error) {
    console.error("[releaseTask] failed:", error);
  }
}

export async function recoverStuckTasks(): Promise<void> {
  try {
    const lockExpiredThreshold = new Date(Date.now() - 60 * 1000);

    const stuckTasks = await prisma.imageTask.findMany({
      where: {
        status: "processing",
        lockExpiresAt: { lt: lockExpiredThreshold },
      },
      select: {
        id: true,
        attemptCount: true,
        maxAttempts: true,
        lockedBy: true,
      },
    });

    for (const task of stuckTasks) {
      const maxAttempts = task.maxAttempts ?? 2;

      if (task.attemptCount >= maxAttempts) {
        await prisma.$transaction(async (tx) => {
          await tx.imageTask.update({
            where: { id: task.id },
            data: {
              status: "failed",
              failReason: "处理超时，已达最大重试次数",
              finishedAt: new Date(),
            },
          });

          const taskData = await tx.imageTask.findUnique({
            where: { id: task.id },
            select: { userId: true, creditsLocked: true, refunded: true },
          });

          if (taskData && !taskData.refunded) {
            await tx.imageTask.update({
              where: { id: task.id },
              data: { refunded: true },
            });
            await tx.user.update({
              where: { id: taskData.userId },
              data: { balance: { increment: taskData.creditsLocked } },
            });
          }
        });
      } else {
        await prisma.imageTask.update({
          where: { id: task.id },
          data: {
            status: "pending",
            lockedBy: null,
            lockExpiresAt: null,
            nextRunAt: new Date(Date.now() + 30 * 1000),
          },
        });
      }
    }

    if (stuckTasks.length > 0) {
      console.log(`[recoverStuckTasks] recovered ${stuckTasks.length} stuck tasks`);
    }
  } catch (error) {
    console.error("[recoverStuckTasks] failed:", error);
  }
}
