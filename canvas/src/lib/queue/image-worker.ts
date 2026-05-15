import "server-only";
import { prisma } from "../prisma";
import { getProvider } from "../providers";
import { persistOutput } from "./persist-output";
import { claimTask, recoverStuckTasks } from "./claim-task";
import { recordFailure, recordSuccess, getAllCircuitBreakers } from "./circuit-breaker";

export interface WorkerConfig {
  workerId: string;
  pollIntervalMs: number;
  maxConcurrency: number;
  recoverIntervalMs: number;
}

const DEFAULT_CONFIG: WorkerConfig = {
  workerId: `worker-${process.pid}-${Date.now()}`,
  pollIntervalMs: 2000,
  maxConcurrency: 5,
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

interface ActiveTaskInfo {
  taskId: number;
  model: string;
}

const DEFAULT_CONCURRENCY_LIMITS: Record<string, number> = {
  openai: 5,
  google: 3,
};

let modelConcurrencyCache: Map<string, number> = new Map();
let modelConcurrencyCacheAt = 0;
const MODEL_CACHE_TTL = 60_000;

async function getModelConcurrencyLimit(modelId: string): Promise<number> {
  if (Date.now() - modelConcurrencyCacheAt > MODEL_CACHE_TTL) {
    const configs = await prisma.modelConfig.findMany({
      where: { enabled: true },
      select: { modelId: true, concurrencyLimit: true },
    });
    modelConcurrencyCache = new Map(configs.map((c) => [c.modelId, c.concurrencyLimit]));
    modelConcurrencyCacheAt = Date.now();
  }
  const limit = modelConcurrencyCache.get(modelId);
  if (limit !== undefined) return limit;
  const providerType = modelId.startsWith("gemini") ? "google" : "openai";
  return DEFAULT_CONCURRENCY_LIMITS[providerType] ?? 3;
}

export class ImageWorker {
  private workerId: string;
  private pollIntervalMs: number;
  private maxConcurrency: number;
  private recoverIntervalMs: number;
  private isRunning = false;
  private activeTasksMap = new Map<number, ActiveTaskInfo>();
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
    return this.activeTasksMap.size;
  }

  getStats(): WorkerStats {
    const breakers = getAllCircuitBreakers();
    return {
      workerId: this.workerId,
      isRunning: this.isRunning,
      activeTasks: this.activeTasksMap.size,
      circuitBreakers: breakers.map((b) => ({
        provider: b.provider,
        failureCount: b.failureCount,
        isOpen: b.isOpen,
        lastFailureAt: b.lastFailureAt?.toISOString() ?? null,
      })),
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
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
        console.error(`[ImageWorker] recover error:`, error);
      }
    }, this.recoverIntervalMs);
  }

  private async runLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.processBatch();
      } catch (error) {
        console.error(`[ImageWorker] loop error:`, error);
      }
      await this.sleep(this.pollIntervalMs);
    }
    console.log(`[ImageWorker] ${this.workerId} stopped`);
  }

  private async processBatch(): Promise<void> {
    const slotsAvailable = this.maxConcurrency - this.activeTasksMap.size;
    if (slotsAvailable <= 0) return;

    for (let i = 0; i < slotsAvailable; i++) {
      if (!this.isRunning) break;

      const excludeModels = await this.getExcludedModels();
      const taskId = await claimTask(this.workerId, excludeModels);
      if (!taskId) break;

      const task = await prisma.imageTask.findUnique({
        where: { id: taskId },
        select: { model: true },
      });
      const modelId = task?.model ?? "gpt-image-2";

      this.activeTasksMap.set(taskId, { taskId, model: modelId });
      this.processTask(taskId, modelId).finally(() => {
        this.activeTasksMap.delete(taskId);
      });
    }
  }

  private async getExcludedModels(): Promise<Set<string>> {
    const excluded = new Set<string>();
    const modelCounts = new Map<string, number>();

    for (const info of this.activeTasksMap.values()) {
      modelCounts.set(info.model, (modelCounts.get(info.model) ?? 0) + 1);
    }

    for (const [modelId, count] of modelCounts) {
      const limit = await getModelConcurrencyLimit(modelId);
      if (count >= limit) {
        excluded.add(modelId);
      }
    }

    return excluded;
  }

  private async processTask(taskId: number, modelId: string): Promise<void> {
    const providerType = modelId.startsWith("gemini") ? "google" : "openai";

    try {
      const task = await prisma.imageTask.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        console.warn(`[ImageWorker] Task ${taskId} not found`);
        return;
      }

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

      if (imageData.b64_json) {
        const persistResult = await persistOutput(
          { kind: "base64", data: imageData.b64_json, mimeType: imageData.mimeType },
          task.userId
        );

        if (!persistResult.isPersisted) {
          await this.failTask(taskId, `OSS upload failed: ${persistResult.error}`);
          return;
        }

        await this.completeTask(taskId, persistResult.url, true, submitResult.raw);
      } else {
        await this.completeTask(taskId, imageData.data, false, submitResult.raw);
      }

      recordSuccess(providerType);
    } catch (error) {
      const errObj = error as { status?: number; errorType?: string; message?: string };
      const status = errObj.status;
      const errorType = errObj.errorType;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(`[ImageWorker] Task ${taskId} failed [${status ?? "?"}/${errorType ?? "unknown"}]:`, errorMessage);

      if (status === 429 || (status !== undefined && status >= 500)) {
        recordFailure(providerType);
      }

      await this.failTask(taskId, errorMessage);
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

    console.log(`[ImageWorker] Task ${taskId} completed`);
  }

  private async failTask(taskId: number, reason: string): Promise<void> {
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
