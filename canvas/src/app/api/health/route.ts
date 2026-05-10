import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/system-settings";

interface CheckResult {
  status: "ok" | "fail";
  ms: number;
  error?: string;
}

async function checkDb(): Promise<CheckResult> {
  const start = Date.now();
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return { status: "ok", ms: Date.now() - start };
  } catch (e) {
    return { status: "fail", ms: Date.now() - start, error: (e as Error).message };
  }
}

async function checkSmtp(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const host = await getSetting("smtp_host", "SMTP_HOST");
    if (!host) return { status: "fail", ms: Date.now() - start, error: "未配置" };
    const nodemailer = await import("nodemailer");
    const port = parseInt((await getSetting("smtp_port", "SMTP_PORT")) || "465", 10);
    const user = await getSetting("smtp_user", "SMTP_USER");
    const pass = await getSetting("smtp_password", "SMTP_PASSWORD");
    if (!user || !pass) return { status: "fail", ms: Date.now() - start, error: "未配置" };
    const secureRaw = await getSetting("smtp_secure", "SMTP_SECURE", "auto");
    const secure = secureRaw === "true" || (secureRaw === "auto" && port === 465);
    const transporter = nodemailer.default.createTransport({
      host, port, secure,
      auth: { user, pass },
      connectionTimeout: 5000,
    });
    await transporter.verify();
    return { status: "ok", ms: Date.now() - start };
  } catch (e) {
    return { status: "fail", ms: Date.now() - start, error: (e as Error).message };
  }
}
async function checkGptImage(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const baseUrl = await getSetting("api_base_url", "GPT_IMAGE_BASE_URL");
    if (!baseUrl) return { status: "fail", ms: Date.now() - start, error: "未配置" };
    const resp = await fetch(baseUrl, { method: "OPTIONS", signal: AbortSignal.timeout(5000) });
    if (resp.ok || resp.status === 204 || resp.status === 405) {
      return { status: "ok", ms: Date.now() - start };
    }
    return { status: "fail", ms: Date.now() - start, error: `HTTP ${resp.status}` };
  } catch (e) {
    return { status: "fail", ms: Date.now() - start, error: (e as Error).message };
  }
}

async function checkOss(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const bucket = await getSetting("oss_bucket", "OSS_BUCKET");
    const region = await getSetting("oss_region", "OSS_REGION");
    const endpoint = await getSetting("oss_endpoint", "OSS_ENDPOINT");
    if (!bucket || !region) return { status: "fail", ms: Date.now() - start, error: "未配置" };
    const host = endpoint
      ? (endpoint.startsWith("http") ? endpoint : `https://${bucket}.${endpoint}`)
      : `https://${bucket}.${region}.aliyuncs.com`;
    const resp = await fetch(host, { method: "HEAD", signal: AbortSignal.timeout(5000) });
    if (resp.ok || resp.status === 403 || resp.status === 404) {
      return { status: "ok", ms: Date.now() - start };
    }
    return { status: "fail", ms: Date.now() - start, error: `HTTP ${resp.status}` };
  } catch (e) {
    return { status: "fail", ms: Date.now() - start, error: (e as Error).message };
  }
}

export async function GET() {
  const [db, smtp, gptImage, oss] = await Promise.all([
    checkDb(),
    checkSmtp(),
    checkGptImage(),
    checkOss(),
  ]);

  const checks = { db, smtp, gptImage, oss };
  const allOk = Object.values(checks).every((c) => c.status === "ok");
  const dbOk = db.status === "ok";

  const status = dbOk ? (allOk ? "ok" : "degraded") : "down";
  const httpStatus = status === "down" ? 503 : 200;

  return NextResponse.json({ status, checks }, { status: httpStatus });
}
