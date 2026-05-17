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

  const TABS: { key: AccountTab; label: string }[] = [
    { key: "wallet", label: "钱包" },
    { key: "security", label: "安全设置" },
  ];

  return (
    <div className="pt-[calc(var(--nav)+40px)] px-10 pb-20 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10">
      {/* 左侧栏 */}
      <aside className="space-y-6">
        <header>
          <h1
            className="text-2xl font-normal mb-1"
            style={{ fontFamily: "var(--font-d)" }}
          >
            账号中心
          </h1>
          <p className="text-xs text-muted truncate" title={user.email}>
            {maskEmail(user.email)}
          </p>
        </header>

        <section className="p-5 bg-surface border border-border rounded-[var(--r)]">
          <div className="text-[10px] text-muted tracking-[.1em] uppercase mb-2 font-mono">
            当前余额
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-medium text-fg tabular-nums"
              style={{ fontFamily: "var(--font-d)" }}
            >
              {user.balance.toFixed(2)}
            </span>
            <span className="text-xs text-muted">积分</span>
          </div>
          <p className="mt-2 text-[11px] text-muted leading-relaxed">
            可生成约 {Math.floor(user.balance / 0.07)} 张图
          </p>
        </section>

        <nav className="flex flex-col gap-0.5">
          {TABS.map(({ key, label }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`relative px-3 py-2 text-sm text-left rounded transition-colors ${
                  active
                    ? "bg-accent-d text-accent"
                    : "text-muted hover:text-fg hover:bg-surface"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-accent" />
                )}
                <span className={active ? "pl-2" : "pl-2"}>{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* 主内容 */}
      <div className="min-w-0">
        {activeTab === "wallet" && (
          <div className="space-y-10">
            <section>
              <h2 className="text-base font-medium text-fg mb-3">充值码兑换</h2>
              <RedeemForm onSuccess={() => setRefreshKey((k) => k + 1)} />
            </section>

            <section>
              <h2 className="text-base font-medium text-fg mb-3">账单记录</h2>
              <TransactionList refreshKey={refreshKey} />
            </section>
          </div>
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
    </div>
  );
}
