import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";
import { queryTask } from "./gpt-image";
import { persistImage } from "./image-persist";

const POLL_INTERVAL_MS = 6_000;
const SUPERVISOR_INTERVAL_MS = 5_000;
const MAX_POLL_DURATION_MS = 30 * 60 * 1000;
const PENDING_TIMEOUT_MS = 5 * 60 * 1000;
const TIMEOUT_REASON = "生成超时，请重试";

const TERMINAL_STATUSES = ["completed", "failed"];
const RUNNABLE_STATUSES = ["pending", "submitted", "processing"];

class PollManager {
  private activePolls = new Set<number>();
  private supervisorTimer: ReturnType<typeof setInterval> | null = null;
  private recovered = false;

  startPolling(taskId: number): void {
    if (this.activePolls.has(taskId)) return;
    this.activePolls.add(taskId);
    setTimeout(() => void this.runLoop(taskId), POLL_INTERVAL_MS);
  }

  stopPolling(taskId: number): void {
    this.activePolls.delete(taskId);
  }

  get activeCount(): number {
    return this.activePolls.size;
  }

  private async runLoop(taskId: number): Promise<void> {
    if (!this.activePolls.has(taskId)) return;
    try {
      const done = await this.pollOnce(taskId);
      if (done) {
        this.activePolls.delete(taskId);
        return;
      }
    } catch (err) {
      console.error(`[PollManager] 轮询任务 ${taskId} 出错:`, err);
    }
    if (this.activePolls.has(taskId)) {
      setTimeout(() => void this.runLoop(taskId), POLL_INTERVAL_MS);
    }
  }

  private async pollOnce(taskId: number): Promise<boolean> {
    const task = await prisma.imageTask.findUnique({ where: { id: taskId } });
    if (!task) return true;
    if (TERMINAL_STATUSES.includes(task.status)) return true;
    if (task.source !== "poll") {
      console.log(`[PollManager] 跳过 source=${task.source} 任务 ${taskId}`);
      return true;
    }

    const ageMs = Date.now() - task.createdAt.getTime();
    const timeoutMs = task.externalTaskId
      ? MAX_POLL_DURATION_MS
      : PENDING_TIMEOUT_MS;
    const timedOut = ageMs >= timeoutMs;

    if (!task.externalTaskId) {
      if (timedOut) {
        await this.failTask(taskId, TIMEOUT_REASON);
        return true;
      }
      return false;
    }

    let result;
    try {
      result = await queryTask(task.externalTaskId);
    } catch (err) {
      if (timedOut) {
        console.warn(
          `[PollManager] 任务 ${taskId} 超时后查询仍失败，按超时处理:`,
          err
        );
        await this.failTask(taskId, TIMEOUT_REASON);
        return true;
      }
      throw err;
    }

    if (result.status === "completed") {
      await this.completeTask(task.id, task.userId, result.imageUrl);
      return true;
    }

    if (result.status === "failed") {
      await this.failTask(taskId, result.failReason);
      return true;
    }

    if (timedOut) {
      await this.failTask(taskId, TIMEOUT_REASON);
      return true;
    }

    if (
      task.status !== "processing" ||
      (result.progress !== undefined && result.progress !== task.progress)
    ) {
      await prisma.imageTask.update({
        where: { id: taskId },
        data: {
          status: "processing",
          progress: result.progress ?? task.progress,
        },
      });
    }
    return false;
  }

  async completeTask(
    taskId: number,
    userId: number,
    sourceUrl: string
  ): Promise<void> {
    const persisted = await persistImage(sourceUrl, userId);
    const task = await prisma.imageTask.findUnique({ where: { id: taskId } });
    if (!task) return;

    const paramsJson = JSON.stringify({
      prompt: task.prompt,
      aspectRatio: task.aspectRatio,
      quality: task.quality,
      count: 1,
      model: task.model,
      stylePresetId: task.stylePresetId,
      referenceImages: task.referenceImagesJson
        ? safeParseArray(task.referenceImagesJson)
        : [],
    });

    await prisma.$transaction(async (tx) => {
      const usage = await tx.usageRecord.create({
        data: {
          userId,
          apiKeyId: null,
          creditsUsed: task.creditsLocked,
          promptSummary: task.promptSummary,
          imageUrl: persisted.url,
          isPersisted: persisted.isPersisted,
          paramsJson,
        },
      });
      await tx.imageTask.update({
        where: { id: taskId },
        data: {
          status: "completed",
          progress: 100,
          imageUrl: persisted.url,
          isPersisted: persisted.isPersisted,
          usageRecordId: usage.id,
        },
      });
    });
    this.activePolls.delete(taskId);
  }

  async failTask(taskId: number, failReason: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const task = await tx.imageTask.findUnique({ where: { id: taskId } });
      if (!task) return;
      if (task.status === "failed" || task.status === "completed") return;

      const shouldRefund = !task.refunded;
      await tx.imageTask.update({
        where: { id: taskId },
        data: {
          status: "failed",
          failReason,
          refunded: shouldRefund ? true : task.refunded,
        },
      });
      if (shouldRefund) {
        await tx.user.update({
          where: { id: task.userId },
          data: {
            balance: { increment: new Prisma.Decimal(task.creditsLocked) },
          },
        });
      }
    });
    this.activePolls.delete(taskId);
  }

  async recoverPendingTasks(): Promise<void> {
    if (this.recovered) return;
    this.recovered = true;
    try {
      const pending = await prisma.imageTask.findMany({
        where: {
          status: { in: RUNNABLE_STATUSES },
          source: "poll",
        },
        select: { id: true },
      });
      for (const t of pending) this.startPolling(t.id);
      if (pending.length > 0) {
        console.log(`[PollManager] 恢复 ${pending.length} 个未完成任务`);
      }
    } catch (err) {
      console.error("[PollManager] 恢复任务失败:", err);
    }
  }

  async scanAndAdopt(): Promise<void> {
    try {
      const tasks = await prisma.imageTask.findMany({
        where: {
          status: { in: RUNNABLE_STATUSES },
          source: "poll",
        },
        select: { id: true },
      });
      const ids = new Set(tasks.map((t) => t.id));
      for (const t of tasks) {
        if (!this.activePolls.has(t.id)) this.startPolling(t.id);
      }
      for (const id of this.activePolls) {
        if (!ids.has(id)) this.activePolls.delete(id);
      }
    } catch (err) {
      console.error("[PollManager] 扫描任务失败:", err);
    }
  }

  startSupervisorLoop(): void {
    if (this.supervisorTimer) return;
    console.log(
      `[PollManager] Supervisor 启动，扫描间隔 ${SUPERVISOR_INTERVAL_MS / 1000}s`
    );
    this.supervisorTimer = setInterval(
      () => void this.scanAndAdopt(),
      SUPERVISOR_INTERVAL_MS
    );
  }

  stopSupervisorLoop(): void {
    if (this.supervisorTimer) {
      clearInterval(this.supervisorTimer);
      this.supervisorTimer = null;
    }
  }
}

function safeParseArray(json: string): unknown[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

const globalForPoll = globalThis as unknown as {
  __canvasPollManager: PollManager | undefined;
};

export const pollManager =
  globalForPoll.__canvasPollManager ?? new PollManager();

if (process.env.NODE_ENV !== "production") {
  globalForPoll.__canvasPollManager = pollManager;
}
