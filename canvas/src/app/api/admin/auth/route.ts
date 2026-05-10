import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { getClientIp } from "@/lib/get-ip";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getSetting, invalidateSettingsCache } from "@/lib/system-settings";
import {
  ADMIN_LOGIN_MAX_FAILURES,
  clearAllFailures,
  clearFailures,
  getRecentFailures,
  recordAttempt,
} from "@/lib/admin-rate-limit";

let bootstrapPromise: Promise<void> | null = null;

async function bootstrapAdminCredentials(): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: "admin_username" },
    update: {},
    create: { key: "admin_username", value: "admin" },
  });

  if (process.env.ADMIN_PASSWORD_RESET !== "true") return;
  const newPassword = process.env.ADMIN_PASSWORD;
  if (!newPassword) {
    console.warn(
      "[admin-auth] ADMIN_PASSWORD_RESET=true 但未设置 ADMIN_PASSWORD，跳过重置"
    );
    return;
  }
  const hash = await hashPassword(newPassword);
  await prisma.systemSetting.upsert({
    where: { key: "admin_password" },
    update: { value: hash },
    create: { key: "admin_password", value: hash },
  });
  invalidateSettingsCache(["admin_password"]);
  await clearAllFailures();
  console.warn(
    "[admin-auth] 已通过 ADMIN_PASSWORD_RESET 重置 admin 密码并清空失败记录。请立即在生产环境取消该环境变量。"
  );
}

function ensureBootstrap(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrapAdminCredentials().catch((err) => {
      console.error("[admin-auth] bootstrap 失败", err);
      bootstrapPromise = null;
    });
  }
  return bootstrapPromise;
}

async function verifyStoredPassword(
  input: string,
  stored: string
): Promise<boolean> {
  if (stored.startsWith("$2")) {
    return verifyPassword(input, stored);
  }
  if (input !== stored) return false;
  try {
    const hash = await hashPassword(input);
    await prisma.systemSetting.upsert({
      where: { key: "admin_password" },
      update: { value: hash },
      create: { key: "admin_password", value: hash },
    });
    invalidateSettingsCache(["admin_password"]);
  } catch (err) {
    console.error("[admin-auth] 明文密码迁移失败", err);
  }
  return true;
}

export async function POST(request: Request) {
  try {
    await ensureBootstrap();

    const body = (await request.json()) as {
      username?: unknown;
      password?: unknown;
    };
    const username =
      typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    const ip = getClientIp(request);

    const failures = await getRecentFailures(ip);
    if (failures >= ADMIN_LOGIN_MAX_FAILURES) {
      return NextResponse.json(
        { success: false, error: "登录失败次数过多，请 15 分钟后再试" },
        { status: 429 }
      );
    }

    if (!username || !password) {
      await recordAttempt(ip, false);
      return NextResponse.json(
        { success: false, error: "账号或密码错误" },
        { status: 401 }
      );
    }

    const expectedUsername =
      (await getSetting("admin_username", "ADMIN_USERNAME", "admin")) ?? "admin";
    const storedPassword = await getSetting("admin_password", "ADMIN_PASSWORD");

    if (!storedPassword) {
      console.error(
        "[admin-auth] admin_password 未配置（system_settings 与 ADMIN_PASSWORD 环境变量均为空）"
      );
      return NextResponse.json(
        { success: false, error: "管理员凭证未配置，请联系部署方" },
        { status: 500 }
      );
    }

    const usernameMatch = username === expectedUsername;
    const passwordMatch = usernameMatch
      ? await verifyStoredPassword(password, storedPassword)
      : false;

    if (!usernameMatch || !passwordMatch) {
      await recordAttempt(ip, false);
      return NextResponse.json(
        { success: false, error: "账号或密码错误" },
        { status: 401 }
      );
    }

    await clearFailures(ip);
    await recordAttempt(ip, true);
    await createSession();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/admin/auth]", error);
    return NextResponse.json(
      { success: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
