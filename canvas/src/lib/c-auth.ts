import "server-only";
import { prisma } from "./prisma";
import { readUserSession } from "./c-session";

export interface AuthedUser {
  id: number;
  email: string;
  balance: number;
  emailVerified: boolean;
  status: string;
}

export class AuthError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export async function getCurrentUser(): Promise<AuthedUser | null> {
  const session = await readUserSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      balance: true,
      emailVerified: true,
      status: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    balance: Number(user.balance),
    emailVerified: user.emailVerified,
    status: user.status,
  };
}

export async function requireUser(): Promise<AuthedUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError(401, "UNAUTHENTICATED", "请先登录");
  }
  if (user.status === "banned") {
    throw new AuthError(403, "USER_BANNED", "账号已被封禁，请联系客服");
  }
  if (!user.emailVerified) {
    throw new AuthError(403, "EMAIL_NOT_VERIFIED", "邮箱尚未激活");
  }
  return user;
}
