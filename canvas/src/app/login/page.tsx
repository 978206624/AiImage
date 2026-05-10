"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-sm p-8 bg-surface border border-border rounded-lg">
        <p className="text-sm text-muted">加载中...</p>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { refresh } = useCurrentUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTo = searchParams.get("redirect") || "/generate";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        await refresh();
        toast("登录成功", "success");
        router.push(redirectTo);
      } else {
        setError(data.error || "登录失败");
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
        <h1 className="text-xl font-medium text-fg mb-1">登录 CANVAS</h1>
        <p className="text-sm text-muted mb-6">用注册的邮箱和密码登录</p>

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
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm text-muted">
                密码
              </label>
              <span
                className="text-xs text-muted/60 cursor-not-allowed"
                title="敬请期待"
              >
                忘记密码？
              </span>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
              placeholder="请输入密码"
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-2 bg-accent text-bg text-sm font-medium rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        <p className="mt-5 text-sm text-muted text-center">
          还没有账号？{" "}
          <Link href="/register" className="text-accent hover:underline">
            立即注册
          </Link>
        </p>
      </div>
    </div>
  );
}
