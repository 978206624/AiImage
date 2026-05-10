"use client";

import { useState } from "react";

interface Props {
  userId: number;
  email: string;
  onClose: () => void;
}

export function ResetPasswordModal({ userId, email, onClose }: Props) {
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/users/${userId}/reset-password`,
        { method: "POST" }
      );
      const data = await res.json();
      if (data.success) {
        setTempPassword(data.data.tempPassword);
      } else {
        setError(data.error || "重置失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  function copy() {
    if (!tempPassword) return;
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-lg w-full max-w-md p-6">
        <h2 className="text-base font-medium text-fg mb-4">重置密码</h2>
        {tempPassword ? (
          <div className="space-y-4">
            <div className="text-sm text-muted">
              新临时密码已生成，请告知用户尽快登录后修改密码：
            </div>
            <div className="p-3 bg-bg border border-border rounded">
              <div className="font-mono text-fg text-sm break-all">
                {tempPassword}
              </div>
            </div>
            <div className="text-xs text-muted">
              用户：<span className="text-fg">{email}</span>。此密码只显示一次，关闭后无法再查看。
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={copy}
                className="px-4 py-2 bg-accent text-bg text-sm font-medium rounded hover:opacity-90"
              >
                {copied ? "已复制" : "复制密码"}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-muted text-sm hover:text-fg"
              >
                关闭
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted">
              将为用户{" "}
              <span className="text-fg font-mono text-xs">{email}</span>{" "}
              生成新的临时密码并强制覆盖原密码。原密码将立即失效。
            </div>
            {error && <div className="text-sm text-red-400">{error}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-muted text-sm hover:text-fg disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "生成中..." : "确认重置"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
