import "server-only";
import { prisma } from "./prisma";

export const ADMIN_LOGIN_MAX_FAILURES = 5;
export const ADMIN_LOGIN_LOCKOUT_MINUTES = 15;

export async function getRecentFailures(ip: string): Promise<number> {
  const since = new Date(
    Date.now() - ADMIN_LOGIN_LOCKOUT_MINUTES * 60 * 1000
  );
  return prisma.adminLoginAttempt.count({
    where: { ip, success: false, attemptedAt: { gte: since } },
  });
}

export async function recordAttempt(
  ip: string,
  success: boolean
): Promise<void> {
  await prisma.adminLoginAttempt.create({ data: { ip, success } });
}

export async function clearFailures(ip: string): Promise<void> {
  await prisma.adminLoginAttempt.deleteMany({
    where: { ip, success: false },
  });
}

export async function clearAllFailures(): Promise<void> {
  await prisma.adminLoginAttempt.deleteMany({ where: { success: false } });
}
