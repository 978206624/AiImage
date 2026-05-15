import "server-only";
import { prisma } from "../prisma";
import { Prisma } from "@/generated/prisma/client";
import { getProvider } from "../providers";
import { persistOutput } from "./persist-output";
import { claimTask, releaseTask } from "./claim-task";
import { recordFailure, recordSuccess } from "./circuit-breaker";

export interface WorkerConfig {
  workerId: string;
  pollIntervalMs: number;
  maxConcurrency: number;
}

const DEFAULT_CONFIG: WorkerConfig = {
  workerId: `worker-${process.pid}-${Date.now()}`,
  pollIntervalMs: 2000,
  maxConcurrency: 3,
};

export class ImageWorker {
  private workerId: string;
  private pollIntervalMs: number;
  private maxConcurrency: number;
  private isRunning = false;
  private activeTasks = new Set<number>();

  constructor(config: Partial<WorkerConfig> = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    this.workerId = cfg.workerId;
    this.pollIntervalMs = cfg.pollIntervalMs;
    this.maxConcurrency = cfg.maxConcurrency;
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

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[ImageWorker] ${this.workerId} started`);
    this.runLoop();
  }

  stop(): void {
    this.isRunning = false;
    console.log(`[ImageWorker] ${this.workerId} stopped`);
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
  }

  private async processBatch(): Promise<void> {
    const slotsAvailable = this.maxConcurrency - this.activeTasks.size;
    if (slotsAvailable <= 0) return;

    for (let i = 0; i < slotsAvailable; i++) {
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
      const provider = await getProvider(modelId);

      if (!provider) {
        await this.failTask(taskId, `Provider for model ${modelId} not found or disabled`);
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
          await this.failTask(taskId, `OSS upload failed: ${persistResult.error}`, provider.provider);
          return;
        }
      } else {
        imageUrl = imageData.data;
      }

      await this.completeTask(taskId, imageUrl, isPersisted, submitResult.raw);
      recordSuccess(provider.provider);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[ImageWorker] Task ${taskId} failed:`, errorMessage);

      const providerType = modelId?.startsWith("gemini") ? "google" : "openai";
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
    const result = await prisma.imageTask.updateMany({
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

    const task = await prisma.imageTask.findUnique({
      where: { id: taskId },
      select: { userId: true, creditsLocked: true },
    });

    if (!task) return;

    const usageRecord = await prisma.usageRecord.create({
      data: {
        userId: task.userId,
        creditsUsed: task.creditsLocked,
        promptSummary: "",
        imageUrl,
        isPersisted,
      },
    });

    await prisma.imageTask.update({
      where: { id: taskId },
      data: { usageRecordId: usageRecord.id },
    });

    console.log(`[ImageWorker] Task ${taskId} completed: ${imageUrl}`);
  }

  private async failTask(taskId: number, reason: string, providerType: string = "openai"): Promise<void> {
    const result = await prisma.imageTask.updateMany({
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

    const task = await prisma.imageTask.findUnique({
      where: { id: taskId },
      select: { userId: true, creditsLocked: true, refunded: true },
    });

    if (!task) return;

    if (!task.refunded) {
      await prisma.imageTask.update({
        where: { id: taskId },
        data: { refunded: true },
      });

      await prisma.user.update({
        where: { id: task.userId },
        data: { balance: { increment: task.creditsLocked } },
      });
    }

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
