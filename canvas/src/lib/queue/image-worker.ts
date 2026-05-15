import "server-only";
import { prisma } from "../prisma";
import { Prisma } from "@/generated/prisma/client";
import { getProvider } from "../providers";
import { persistOutput } from "./persist-output";
import { claimTask, releaseTask, recoverStuckTasks } from "./claim-task";
import { recordFailure, recordSuccess, isCircuitOpen } from "./circuit-breaker";

export interface WorkerConfig {
  workerId: string;
  pollIntervalMs: number;
  maxConcurrency: number;
  recoverIntervalMs: number;
}

const DEFAULT_CONFIG: WorkerConfig = {
  workerId: `worker-${process.pid}-${Date.now()}`,
  pollIntervalMs: 2000,
  maxConcurrency: 3,
  recoverIntervalMs: 60000,
};

export interface WorkerStats {
  workerId: string;
  isRunning: boolean;
  activeTasks: number;
  circuitBreakers: Array<{
    provider: string;
    failureCount: number;
    isOpen: boolean;
    lastFailureAt: string | null;
  }>;
}

export class ImageWorker {
  private workerId: string;
  private pollIntervalMs: number;
  private maxConcurrency: number;
  private recoverIntervalMs: number;
  private isRunning = false;
  private activeTasks = new Set<number>();
  private recoverTimer?: NodeJS.Timeout;

  constructor(config: Partial<WorkerConfig> = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    this.workerId = cfg.workerId;
    this.pollIntervalMs = cfg.pollIntervalMs;
    this.maxConcurrency = cfg.maxConcurrency;
    this.recoverIntervalMs = cfg.recoverIntervalMs;
  }

  get workerIdValue(): string {
    return this.workerId;
  }

  isActive(): boolean {
    return this.isRunning;
  }

  getActiveCount(): number {
    return this.activeTasks.size;
  }

  getStats(): WorkerStats {
    const breakers = Array.from(
      new Set([
        ...Array.from(this.activeTasks).map(() => "openai"),
      ])
    );
    return {
      workerId: this.workerId,
      isRunning: this.isRunning,
      activeTasks: this.activeTasks.size,
      circuitBreakers: breakers.map((p) => ({
        provider: p,
        failureCount: 0,
        isOpen: isCircuitOpen(p),
        lastFailureAt: null,
      })),
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log(`[ImageWorker] ${this.workerId} already running`);
      return;
    }

    this.isRunning = true;
    console.log(`[ImageWorker] ${this.workerId} starting...`);

    await recoverStuckTasks();

    this.startRecoverTimer();

    console.log(`[ImageWorker] ${this.workerId} started`);
    this.runLoop();
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.recoverTimer) {
      clearInterval(this.recoverTimer);
      this.recoverTimer = undefined;
    }
    console.log(`[ImageWorker] ${this.workerId} stopping...`);
  }

  private startRecoverTimer(): void {
    this.recoverTimer = setInterval(async () => {
      try {
        await recoverStuckTasks();
      } catch (error) {
        console.error(`[ImageWorker] ${this.workerId} recover error:`, error);
      }
    }, this.recoverIntervalMs);
  }

  private async runLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.processBatch();
      } catch (error) {
        console.error(`[ImageWorker] ${this.workerId} loop error:`, error);
      }
      await this.sleep(this.pollIntervalMs);
    }
    console.log(`[ImageWorker] ${this.workerId} stopped`);
  }

  private async processBatch(): Promise<void> {
    const slotsAvailable = this.maxConcurrency - this.activeTasks.size;
    if (slotsAvailable <= 0) return;

    for (let i = 0; i < slotsAvailable; i++) {
      if (!this.isRunning) break;

      const taskId = await claimTask(this.workerId);
      if (!taskId) break;

      this.activeTasks.add(taskId);
      this.processTask(taskId).finally(() => {
        this.activeTasks.delete(taskId);
      });
    }
  }

  private async processTask(taskId: number): Promise<void> {
    let modelId: string | undefined;
    let providerType = "openai";

    try {
      const task = await prisma.imageTask.findUnique({
        where: { id: taskId },
        include: { user: { select: { id: true, email: true } } },
      });

      if (!task) {
        console.warn(`[ImageWorker] Task ${taskId} not found`);
        return;
      }

      modelId = task.model ?? "gpt-image-2";
      providerType = modelId?.startsWith("gemini") ? "google" : "openai";

      if (isCircuitOpen(providerType)) {
        console.log(`[ImageWorker] ${providerType} circuit breaker is open, skipping task ${taskId}`);
        return;
      }

      const provider = await getProvider(modelId);

      if (!provider) {
        await this.failTask(taskId, `Provider for model ${modelId} not found or disabled`, providerType);
        return;
      }

      const submitResult = await provider.submitTask({
        prompt: task.prompt,
        size: task.size,
        quality: task.quality,
        referenceImages: task.referenceImagesJson
          ? JSON.parse(task.referenceImagesJson)
          : undefined,
        userId: task.userId,
      });

      const imageData = submitResult.imageData;

      let imageUrl: string;
      let isPersisted = false;

      if (imageData.b64_json) {
        const persistResult = await persistOutput(
          { kind: "base64", data: imageData.b64_json, mimeType: imageData.mimeType },
          task.userId
        );
        imageUrl = persistResult.url;
        isPersisted = persistResult.isPersisted;

        if (!persistResult.isPersisted) {
          await this.failTask(taskId, `OSS upload failed: ${persistResult.error}`, providerType);
          return;
        }
      } else {
        imageUrl = imageData.data;
      }

      await this.completeTask(taskId, imageUrl, isPersisted, submitResult.raw);
      recordSuccess(providerType);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[ImageWorker] Task ${taskId} failed:`, errorMessage);

      recordFailure(providerType);
      await this.failTask(taskId, errorMessage, providerType);
    }
  }

  private async completeTask(
    taskId: number,
    imageUrl: string,
    isPersisted: boolean,
    raw?: unknown
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const result = await tx.imageTask.updateMany({
        where: {
          id: taskId,
          lockedBy: this.workerId,
          status: "processing",
        },
        data: {
          status: "completed",
          progress: 100,
          imageUrl,
          isPersisted,
          finishedAt: new Date(),
          upstreamRaw: raw ? JSON.stringify(raw).slice(0, 2000) : null,
        },
      });

      if (result.count === 0) {
        console.log(`[ImageWorker] Task ${taskId} already processed by another worker, skipping`);
        return;
      }

      const task = await tx.imageTask.findUnique({
        where: { id: taskId },
        select: { userId: true, creditsLocked: true },
      });

      if (!task) return;

      const usageRecord = await tx.usageRecord.create({
        data: {
          userId: task.userId,
          creditsUsed: task.creditsLocked,
          promptSummary: "",
          imageUrl,
          isPersisted,
        },
      });

      await tx.imageTask.update({
        where: { id: taskId },
        data: { usageRecordId: usageRecord.id },
      });
    });

    console.log(`[ImageWorker] Task ${taskId} completed: ${imageUrl}`);
  }

  private async failTask(taskId: number, reason: string, providerType: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const result = await tx.imageTask.updateMany({
        where: {
          id: taskId,
          lockedBy: this.workerId,
          status: { in: ["pending", "processing", "submitted"] },
        },
        data: {
          status: "failed",
          failReason: reason,
          finishedAt: new Date(),
        },
      });

      if (result.count === 0) {
        console.log(`[ImageWorker] Task ${taskId} already processed by another worker, skipping`);
        return;
      }

      const task = await tx.imageTask.findUnique({
        where: { id: taskId },
        select: { userId: true, creditsLocked: true, refunded: true },
      });

      if (!task) return;

      if (!task.refunded) {
        await tx.imageTask.update({
          where: { id: taskId },
          data: { refunded: true },
        });

        await tx.user.update({
          where: { id: task.userId },
          data: { balance: { increment: task.creditsLocked } },
        });
      }
    });

    console.log(`[ImageWorker] Task ${taskId} failed: ${reason}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

const globalForWorker = globalThis as unknown as {
  __canvasImageWorker: ImageWorker | undefined;
};

export const imageWorker =
  globalForWorker.__canvasImageWorker ?? new ImageWorker();

if (process.env.NODE_ENV !== "production") {
  globalForWorker.__canvasImageWorker = imageWorker;
}

export async function startWorker(): Promise<void> {
  await imageWorker.start();
}

export function stopWorker(): void {
  imageWorker.stop();
}

export function getWorkerStats(): WorkerStats {
  return imageWorker.getStats();
}
