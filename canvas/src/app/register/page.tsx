"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { refresh } = useCurrentUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    if (password.length < 8) {
      setError("密码至少 8 位");
      return;
    }
    if (!agreed) {
      setError("请先勾选同意服务条款");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        await refresh();
        toast("注册成功，已赠送 0.21 积分", "success");
        router.push("/generate");
      } else {
        setError(data.error || "注册失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-sm p-8 bg-surface border border-border rounded-lg">
        <h1 className="text-xl font-medium text-fg mb-1">注册 CANVAS</h1>
        <p className="text-sm text-muted mb-6">
          注册即赠送 0.21 积分，可生成 3 张图免费体验
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm text-muted mb-1.5"
            >
              邮箱
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
              placeholder="your@email.com"
              autoComplete="email"
              autoFocus
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm text-muted mb-1.5"
            >
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
              placeholder="至少 8 位"
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label
              htmlFor="confirm"
              className="block text-sm text-muted mb-1.5"
            >
              确认密码
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
              placeholder="再次输入密码"
              autoComplete="new-password"
              required
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-muted leading-relaxed">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 accent-accent"
            />
            <span>我已阅读并同意 CANVAS 服务条款及隐私政策</span>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email || !password || !confirm}
            className="w-full py-2 bg-accent text-bg text-sm font-medium rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "注册中..." : "注册"}
          </button>
        </form>

        <p className="mt-5 text-sm text-muted text-center">
          已有账号？{" "}
          <Link href="/login" className="text-accent hover:underline">
            立即登录
          </Link>
        </p>
      </div>
    </div>
  );
}
