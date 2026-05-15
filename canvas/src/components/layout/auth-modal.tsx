"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useCurrentUser } from "@/hooks/use-current-user";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

export function AuthModal({ open, onClose, defaultTab = "login" }: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "register">(defaultTab);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm p-7 bg-surface border border-border rounded-[var(--r)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-1 mb-6 bg-bg rounded p-1">
          <button
            onClick={() => setTab("login")}
            className={`flex-1 py-1.5 text-sm rounded transition-colors ${
              tab === "login"
                ? "bg-surface text-fg font-medium"
                : "text-muted hover:text-fg"
            }`}
          >
            登录
          </button>
          <button
            onClick={() => setTab("register")}
            className={`flex-1 py-1.5 text-sm rounded transition-colors ${
              tab === "register"
                ? "bg-surface text-fg font-medium"
                : "text-muted hover:text-fg"
            }`}
          >
            注册
          </button>
        </div>

        {tab === "login" ? (
          <LoginForm onSuccess={onClose} onSwitchToRegister={() => setTab("register")} />
        ) : (
          <RegisterForm onSuccess={onClose} onSwitchToLogin={() => setTab("login")} />
        )}
      </div>
    </div>
  );
}

/* ---- Login Form ---- */

function LoginForm({
  onSuccess,
  onSwitchToRegister,
}: {
  onSuccess: () => void;
  onSwitchToRegister: () => void;
}) {
  const { toast } = useToast();
  const { refresh } = useCurrentUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        onSuccess();
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="modal-login-email" className="block text-sm text-muted mb-1.5">
          邮箱
        </label>
        <input
          id="modal-login-email"
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
          <label htmlFor="modal-login-password" className="block text-sm text-muted">
            密码
          </label>
          <span className="text-xs text-muted/60 cursor-not-allowed" title="敬请期待">
            忘记密码？
          </span>
        </div>
        <input
          id="modal-login-password"
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

      <p className="text-sm text-muted text-center">
        还没有账号？{" "}
        <button type="button" onClick={onSwitchToRegister} className="text-accent hover:underline">
          立即注册
        </button>
      </p>
    </form>
  );
}

/* ---- Register Form ---- */

function RegisterForm({
  onSuccess,
  onSwitchToLogin,
}: {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}) {
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
        onSuccess();
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="modal-register-email" className="block text-sm text-muted mb-1.5">
          邮箱
        </label>
        <input
          id="modal-register-email"
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
        <label htmlFor="modal-register-password" className="block text-sm text-muted mb-1.5">
          密码
        </label>
        <input
          id="modal-register-password"
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
        <label htmlFor="modal-register-confirm" className="block text-sm text-muted mb-1.5">
          确认密码
        </label>
        <input
          id="modal-register-confirm"
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

      <p className="text-sm text-muted text-center">
        已有账号？{" "}
        <button type="button" onClick={onSwitchToLogin} className="text-accent hover:underline">
          立即登录
        </button>
      </p>
    </form>
  );
}
