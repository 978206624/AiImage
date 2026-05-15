export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startWorker } = await import("@/lib/queue/image-worker");
  const { pollManager } = await import("@/lib/poll-manager");

  pollManager.recoverPendingTasks();
  pollManager.startSupervisorLoop();

  startWorker().catch((error) => {
    console.error("[instrumentation] Worker start failed:", error);
  });
}
