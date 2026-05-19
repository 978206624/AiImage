import "server-only";
import { cookies } from "next/headers";
import { signUserToken, verifyUserToken } from "./c-jwt";
import type { UserSessionPayload } from "./c-jwt";

const COOKIE_NAME = "canvas_session";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function createUserSession(
  userId: number,
  email: string
): Promise<void> {
  const token = await signUserToken(userId, email);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: false,
    expires: new Date(Date.now() + SEVEN_DAYS_MS),
    sameSite: "lax",
    path: "/",
  });
}

export async function destroyUserSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function readUserSession(): Promise<UserSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return verifyUserToken(token);
}
