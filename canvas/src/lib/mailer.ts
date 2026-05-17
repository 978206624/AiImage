import "server-only";
import nodemailer from "nodemailer";
import { getRequiredSetting, getSetting } from "./system-settings";

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

async function loadSmtpConfig(): Promise<SmtpConfig> {
  const host = await getRequiredSetting(
    "smtp_host",
    "SMTP_HOST",
    "SMTP 配置不完整，请在系统设置中配置 SMTP Host"
  );
  const portRaw = await getRequiredSetting(
    "smtp_port",
    "SMTP_PORT",
    "SMTP 配置不完整，请在系统设置中配置 SMTP Port"
  );
  const user = await getRequiredSetting(
    "smtp_user",
    "SMTP_USER",
    "SMTP 配置不完整，请在系统设置中配置 SMTP 用户名"
  );
  const pass = await getRequiredSetting(
    "smtp_password",
    "SMTP_PASSWORD",
    "SMTP 配置不完整，请在系统设置中配置 SMTP 密码"
  );
  const from = await getRequiredSetting(
    "smtp_from",
    "SMTP_FROM",
    "SMTP 配置不完整，请在系统设置中配置发件人地址"
  );
  const secureRaw = await getSetting("smtp_secure", "SMTP_SECURE", "auto");

  const port = parseInt(portRaw, 10);
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    throw new Error(`SMTP 端口配置无效：${portRaw}`);
  }

  const secure =
    secureRaw === "true" || (secureRaw === "auto" && port === 465);

  return { host, port, secure, user, pass, from };
}

async function buildTransport() {
  const cfg = await loadSmtpConfig();
  return {
    transporter: nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    }),
    from: cfg.from,
  };
}

export async function verifySmtpConfig(): Promise<void> {
  const { transporter } = await buildTransport();
  await transporter.verify();
}

export async function sendTestEmail(to: string): Promise<void> {
  const { transporter, from } = await buildTransport();
  await transporter.sendMail({
    from,
    to,
    subject: "Mira — SMTP 测试邮件",
    text: "这是一封来自 Mira 的 SMTP 测试邮件。如果你收到此邮件，说明邮件服务配置正确。",
    html: `<p>这是一封来自 <strong>Mira</strong> 的 SMTP 测试邮件。</p><p>如果你收到此邮件，说明邮件服务配置正确。</p>`,
  });
}

export async function sendVerifyEmail(
  to: string,
  token: string,
  baseUrl: string
): Promise<void> {
  const { transporter, from } = await buildTransport();
  const link = `${baseUrl.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}`;
  await transporter.sendMail({
    from,
    to,
    subject: "Mira — 激活你的账号",
    text: `欢迎加入 Mira。\n\n请点击以下链接激活账号（24 小时内有效）：\n${link}\n\n如果你没有注册过 Mira，请忽略此邮件。`,
    html: `
      <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a1a;">
        <h1 style="font-size:20px;font-weight:600;margin:0 0 16px;">欢迎加入 MI&#9672;RA</h1>
        <p style="font-size:14px;line-height:1.6;margin:0 0 20px;">点击下方按钮激活账号，激活后将自动获得 0.21 积分（3 张免费体验）。</p>
        <p style="margin:24px 0;"><a href="${link}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-size:14px;">激活账号</a></p>
        <p style="font-size:12px;color:#666;line-height:1.6;margin:0 0 8px;">链接 24 小时内有效。如按钮无法点击，请复制以下地址到浏览器打开：</p>
        <p style="font-size:12px;color:#666;word-break:break-all;margin:0 0 20px;">${link}</p>
        <p style="font-size:12px;color:#999;margin:0;">如果你没有注册过 Mira，请忽略此邮件。</p>
      </div>
    `,
  });
}

export async function sendResetEmail(
  to: string,
  token: string,
  baseUrl: string
): Promise<void> {
  const { transporter, from } = await buildTransport();
  const link = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
  await transporter.sendMail({
    from,
    to,
    subject: "Mira — 重置密码",
    text: `你正在重置 Mira 账号密码。\n\n请点击以下链接设置新密码（24 小时内有效）：\n${link}\n\n如果你没有发起重置请求，请忽略此邮件，并建议尽快修改密码。`,
    html: `
      <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a1a;">
        <h1 style="font-size:20px;font-weight:600;margin:0 0 16px;">重置 MI&#9672;RA 密码</h1>
        <p style="font-size:14px;line-height:1.6;margin:0 0 20px;">点击下方按钮设置新密码。</p>
        <p style="margin:24px 0;"><a href="${link}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-size:14px;">设置新密码</a></p>
        <p style="font-size:12px;color:#666;line-height:1.6;margin:0 0 8px;">链接 24 小时内有效。如按钮无法点击，请复制以下地址到浏览器打开：</p>
        <p style="font-size:12px;color:#666;word-break:break-all;margin:0 0 20px;">${link}</p>
        <p style="font-size:12px;color:#999;margin:0;">如果你没有发起重置请求，请忽略此邮件，并建议尽快检查账号安全。</p>
      </div>
    `,
  });
}
