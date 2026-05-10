import "server-only";
import { prisma } from "./prisma";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const REGISTRATION_WINDOW_MS = 24 * 60 * 60 * 1000;
const REGISTRATION_LIMIT = 3;
const PASSWORD_MIN_LENGTH = 8;
const EMAIL_MAX_LENGTH = 190;

export function validateEmail(email: string): string | null {
  if (!email) return "邮箱不能为空";
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > EMAIL_MAX_LENGTH) return "邮箱过长";
  if (!EMAIL_REGEX.test(trimmed)) return "邮箱格式不正确";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "密码不能为空";
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `密码至少 ${PASSWORD_MIN_LENGTH} 位`;
  }
  if (password.trim().length === 0) return "密码不能为纯空格";
  return null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function checkRegistrationRateLimit(ip: string): Promise<boolean> {
  const since = new Date(Date.now() - REGISTRATION_WINDOW_MS);
  const count = await prisma.registrationAttempt.count({
    where: {
      ip,
      createdAt: { gte: since },
    },
  });
  return count < REGISTRATION_LIMIT;
}

export async function recordRegistrationAttempt(ip: string): Promise<void> {
  await prisma.registrationAttempt.create({
    data: { ip },
  });
}
