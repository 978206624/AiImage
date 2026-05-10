"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { RedeemForm } from "@/components/account/redeem-form";
import { TransactionList } from "@/components/account/transaction-list";
import { ChangePasswordForm } from "@/components/account/change-password-form";

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  if (name.length <= 2) return `${name[0] || ""}***@${domain}`;
  return `${name[0]}***${name[name.length - 1]}@${domain}`;
}

type AccountTab = "wallet" | "security";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<AccountTab>("wallet");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/account");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="pt-[calc(var(--nav)+40px)] px-10 pb-20 text-muted text-sm">
        加载中...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="pt-[calc(var(--nav)+40px)] px-10 pb-20 max-w-3xl mx-auto">
      <header className="mb-8">
        <h1
          className="text-3xl font-normal mb-1"
          style={{ fontFamily: "var(--font-d)" }}
        >
          账号中心
        </h1>
        <p className="text-sm text-muted" title={user.email}>
          {maskEmail(user.email)}
        </p>
      </header>

      <section className="mb-10 p-6 bg-surface border border-border rounded-[var(--r)]">
        <div className="text-xs text-muted tracking-[.1em] uppercase mb-2">
          当前余额
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className="text-4xl font-medium text-fg tabular-nums"
            style={{ fontFamily: "var(--font-d)" }}
          >
            {user.balance.toFixed(2)}
          </span>
          <span className="text-sm text-muted">积分</span>
        </div>
        <p className="mt-2 text-xs text-muted">
          每张图消耗 0.07 积分，可用余额生成约{" "}
          {Math.floor(user.balance / 0.07)} 张图
        </p>
      </section>

      <div className="flex border-b border-border mb-6">
        {(
          [
            ["wallet", "钱包"],
            ["security", "安全设置"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm transition-colors ${
              activeTab === key
                ? "text-fg border-b-2 border-accent"
                : "text-muted hover:text-fg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "wallet" && (
        <>
          <section className="mb-10">
            <h2 className="text-base font-medium text-fg mb-3">充值码兑换</h2>
            <p className="text-xs text-muted mb-3">
              输入淘宝购买的充值码（CV- 开头的 16 位字符）兑换为账号余额。v1.0
              时代购买的旧 Key 同样可在此兑换。
            </p>
            <RedeemForm onSuccess={() => setRefreshKey((k) => k + 1)} />
          </section>

          <section>
            <h2 className="text-base font-medium text-fg mb-3">账单记录</h2>
            <TransactionList refreshKey={refreshKey} />
          </section>
        </>
      )}

      {activeTab === "security" && (
        <section>
          <h2 className="text-base font-medium text-fg mb-3">修改密码</h2>
          <p className="text-xs text-muted mb-4">
            填写当前密码与新密码，提交后立即生效，原密码作废。
          </p>
          <ChangePasswordForm />
        </section>
      )}
    </div>
  );
}
