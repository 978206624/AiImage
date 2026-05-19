"use client";

import { useState, useEffect } from "react";

interface SettingField {
  key: string;
  label: string;
  type: "text" | "password";
  placeholder: string;
  hint?: string;
}

interface SettingGroup {
  title: string;
  description?: string;
  fields: SettingField[];
}

const groups: SettingGroup[] = [
  {
    title: "基础配置",
    description: "中转站接口与阿里云 OSS",
    fields: [
      {
        key: "api_base_url",
        label: "GPT Image 中转站 API 地址",
        type: "text",
        placeholder: "https://your-proxy.com",
      },
      {
        key: "api_key",
        label: "GPT Image 中转站 API Key",
        type: "password",
        placeholder: "sk-xxx",
      },
      {
        key: "gemini_api_base_url",
        label: "Gemini 中转站 API 地址",
        type: "text",
        placeholder: "https://your-proxy.com",
      },
      {
        key: "gemini_api_key",
        label: "Gemini 中转站 API Key",
        type: "password",
        placeholder: "sk-xxx",
      },
      {
        key: "oss_access_key_id",
        label: "OSS AccessKey ID",
        type: "password",
        placeholder: "LTAI...",
      },
      {
        key: "oss_access_key_secret",
        label: "OSS AccessKey Secret",
        type: "password",
        placeholder: "密钥",
      },
      {
        key: "oss_bucket",
        label: "OSS Bucket",
        type: "text",
        placeholder: "your-bucket-name",
      },
      {
        key: "oss_region",
        label: "OSS Region",
        type: "text",
        placeholder: "cn-hangzhou",
      },
      {
        key: "oss_endpoint",
        label: "OSS Endpoint",
        type: "text",
        placeholder: "oss-cn-hangzhou.aliyuncs.com（留空则按 Region 自动推导）",
      },
    ],
  },
  {
    title: "积分配置",
    description: "生图扣费与新用户赠送",
    fields: [
      {
        key: "credits_per_image",
        label: "单次生图积分消耗",
        type: "text",
        placeholder: "0.07",
      },
      {
        key: "register_bonus_credits",
        label: "注册赠送积分",
        type: "text",
        placeholder: "0.21（约 3 张体验）",
      },
    ],
  },
  {
    title: "邮件服务",
    description: "SMTP 协议，用于注册激活、密码重置邮件",
    fields: [
      {
        key: "smtp_host",
        label: "SMTP Host",
        type: "text",
        placeholder: "smtp.example.com",
      },
      {
        key: "smtp_port",
        label: "SMTP Port",
        type: "text",
        placeholder: "465 / 587",
      },
      {
        key: "smtp_secure",
        label: "SMTP Secure",
        type: "text",
        placeholder: "auto / true / false（默认 auto: 465 端口启用 TLS）",
      },
      {
        key: "smtp_user",
        label: "SMTP 用户名",
        type: "text",
        placeholder: "noreply@example.com",
      },
      {
        key: "smtp_password",
        label: "SMTP 密码",
        type: "password",
        placeholder: "授权码或密码",
      },
      {
        key: "smtp_from",
        label: "发件人",
        type: "text",
        placeholder: "Mira <noreply@example.com>",
      },
    ],
  },
  {
    title: "安全",
    description: "管理员账号 + 密码",
    fields: [
      {
        key: "admin_username",
        label: "管理员账号",
        type: "text",
        placeholder: "admin",
        hint: "4-32 字符，仅字母数字下划线，留空表示不修改",
      },
      {
        key: "admin_password",
        label: "管理员密码",
        type: "password",
        placeholder: "留空表示不修改",
        hint: "保存时自动 bcrypt 加密存储；旧明文密码登录后将自动迁移",
      },
    ],
  },
];

const ALL_FIELDS = groups.flatMap((g) => g.fields);

export default function AdminSettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        if (!cancelled && data.success) {
          setValues(data.data);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const payload: Record<string, string> = {};
      for (const field of ALL_FIELDS) {
        if (values[field.key]) {
          payload[field.key] = values[field.key];
        }
      }

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setMessage("保存成功");
      } else {
        setMessage(data.error || "保存失败");
      }
    } catch {
      setMessage("网络错误");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  }

  async function sendTestEmail() {
    setTestResult(null);
    const to = testEmail.trim();
    if (!to) {
      setTestResult({ ok: false, msg: "请输入收件人邮箱" });
      return;
    }
    setTestSending(true);
    try {
      const res = await fetch("/api/admin/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ ok: true, msg: `测试邮件已发送至 ${to}` });
      } else {
        setTestResult({ ok: false, msg: data.error || "发送失败" });
      }
    } catch {
      setTestResult({ ok: false, msg: "网络错误" });
    } finally {
      setTestSending(false);
    }
  }

  if (loading) {
    return <div className="text-muted text-sm">加载中...</div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-medium text-fg mb-6">系统设置</h1>

      <form onSubmit={handleSave} className="space-y-6">
        {groups.map((group) => (
          <section
            key={group.title}
            className="border border-border rounded-lg bg-surface p-5"
          >
            <h2 className="text-sm font-medium text-fg mb-1">{group.title}</h2>
            {group.description && (
              <p className="text-xs text-muted mb-4">{group.description}</p>
            )}
            <div className="space-y-4">
              {group.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm text-muted mb-1.5">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={values[field.key] || ""}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                  />
                  {field.hint && (
                    <p className="text-xs text-muted mt-1">{field.hint}</p>
                  )}
                </div>
              ))}

              {group.title === "邮件服务" && (
                <div className="pt-3 mt-3 border-t border-border space-y-2">
                  <div className="text-sm text-muted">测试邮件</div>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="收件人邮箱"
                      className="flex-1 px-3 py-2 bg-bg border border-border rounded text-fg text-sm focus:outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={sendTestEmail}
                      disabled={testSending}
                      className="px-4 py-2 text-sm border border-border rounded text-muted hover:text-fg hover:border-accent disabled:opacity-50"
                    >
                      {testSending ? "发送中..." : "发送测试邮件"}
                    </button>
                  </div>
                  {testResult && (
                    <div
                      className={`text-sm ${
                        testResult.ok ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {testResult.msg}
                    </div>
                  )}
                  <p className="text-xs text-muted">
                    保存配置后再发送测试，使用最新的 SMTP 设置。
                  </p>
                </div>
              )}
            </div>
          </section>
        ))}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-accent text-bg text-sm font-medium rounded hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存设置"}
          </button>
          {message && (
            <span
              className={`text-sm ${
                message === "保存成功" ? "text-green-400" : "text-red-400"
              }`}
            >
              {message}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
