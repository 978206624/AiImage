export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { pollManager } = await import("@/lib/poll-manager");
  await pollManager.recoverPendingTasks();
  pollManager.startSupervisorLoop();
}
