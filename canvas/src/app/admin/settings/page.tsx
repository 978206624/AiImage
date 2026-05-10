"use client";

import { useState, useEffect } from "react";

interface SettingField {
  key: string;
  label: string;
  type: "text" | "password";
  placeholder: string;
}

const fields: SettingField[] = [
  {
    key: "api_base_url",
    label: "中转站 API 地址",
    type: "text",
    placeholder: "https://your-proxy.com",
  },
  {
    key: "api_key",
    label: "中转站 API Key",
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
  {
    key: "credits_per_image",
    label: "单次生图积分消耗",
    type: "text",
    placeholder: "0.07",
  },
  {
    key: "admin_password",
    label: "管理员密码",
    type: "password",
    placeholder: "修改管理员密码",
  },
];

export default function AdminSettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success) {
        setValues(data.data);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const payload: Record<string, string> = {};
      for (const field of fields) {
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

  if (loading) {
    return (
      <div className="text-muted text-sm">加载中...</div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-medium text-fg mb-6">系统设置</h1>

      <form onSubmit={handleSave} className="space-y-5">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-sm text-muted mb-1.5">
              {field.label}
            </label>
            <input
              type={field.type}
              value={values[field.key] || ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
              }
              placeholder={field.placeholder}
              className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>
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
