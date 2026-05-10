"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const LOCKOUT_COOLDOWN_SECONDS = 60;

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cooldown > 0) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        router.push("/admin");
        return;
      }

      setError(data.error || "登录失败");
      if (res.status === 429) {
        setCooldown(LOCKOUT_COOLDOWN_SECONDS);
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || cooldown > 0 || !username || !password;
  const buttonLabel =
    cooldown > 0
      ? `请等待 ${cooldown} 秒`
      : loading
        ? "登录中..."
        : "登录";

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-sm p-8 bg-surface border border-border rounded-lg">
        <h1 className="text-xl font-medium text-fg mb-1">CANVAS 管理后台</h1>
        <p className="text-sm text-muted mb-6">输入账号和密码登录</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm text-muted mb-2"
            >
              管理员账号
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
              placeholder="admin"
              autoFocus
              autoComplete="username"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm text-muted mb-2"
            >
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
              placeholder="请输入管理员密码"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={disabled}
            className="w-full py-2 bg-accent text-bg text-sm font-medium rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {buttonLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
