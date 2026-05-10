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

export default function AccountPage() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const [refreshKey, setRefreshKey] = useState(0);

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

      <section className="mb-10">
        <h2 className="text-base font-medium text-fg mb-3">充值码兑换</h2>
        <p className="text-xs text-muted mb-3">
          输入淘宝购买的充值码（CV- 开头的 16 位字符）兑换为账号余额。v1.0
          时代购买的旧 Key 同样可在此兑换。
        </p>
        <RedeemForm onSuccess={() => setRefreshKey((k) => k + 1)} />
      </section>

      <section className="mb-10">
        <h2 className="text-base font-medium text-fg mb-3">账单记录</h2>
        <TransactionList refreshKey={refreshKey} />
      </section>

      <section>
        <h2 className="text-base font-medium text-fg mb-3">安全设置</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
