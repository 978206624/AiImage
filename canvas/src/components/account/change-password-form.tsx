"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";

export function ChangePasswordForm() {
  const { toast } = useToast();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("新密码至少 8 位");
      return;
    }
    if (newPassword !== confirm) {
      setError("两次输入的新密码不一致");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();

      if (data.success) {
        toast("密码已修改", "success");
        setOldPassword("");
        setNewPassword("");
        setConfirm("");
      } else {
        setError(data.error || "修改失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
      <div>
        <label className="block text-sm text-muted mb-1.5">旧密码</label>
        <input
          type="password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          autoComplete="current-password"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-muted mb-1.5">新密码</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          placeholder="至少 8 位"
          autoComplete="new-password"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-muted mb-1.5">确认新密码</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          autoComplete="new-password"
          required
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading || !oldPassword || !newPassword || !confirm}
        className="px-4 py-2 bg-accent text-bg text-sm font-medium rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "提交中..." : "修改密码"}
      </button>
    </form>
  );
}
