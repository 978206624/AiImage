"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BalanceAdjustModal } from "@/components/admin/balance-adjust-modal";
import { ResetPasswordModal } from "@/components/admin/reset-password-modal";
import { UserStatusToggle } from "@/components/admin/user-status-toggle";

interface UserDetail {
  id: number;
  email: string;
  balance: number;
  totalConsumed: number;
  emailVerified: boolean;
  hasReceivedBonus: boolean;
  registerIp: string | null;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
}

interface AuditLog {
  id: number;
  action: string;
  payload: string;
  createdAt: string;
}

interface TopupRecord {
  id: number;
  key: string;
  totalCredits: number;
  usedCredits: number;
  redeemedAt: string | null;
}

interface UsageRecord {
  id: number;
  creditsUsed: number;
  promptSummary: string | null;
  imageUrl: string | null;
  isPersisted: boolean;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  balance_adjust: "调整余额",
  status_change: "状态变更",
  password_reset: "重置密码",
};

function describeAction(action: string, payloadJson: string): string {
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(payloadJson) as Record<string, unknown>;
  } catch {
    return ACTION_LABELS[action] ?? action;
  }
  const label = ACTION_LABELS[action] ?? action;
  if (action === "balance_adjust") {
    const delta = Number(payload.delta);
    const reason = payload.reason ? `（${payload.reason}）` : "";
    const sign = delta >= 0 ? "+" : "";
    return `${label} ${sign}${delta.toFixed(2)} ${payload.before}→${payload.after}${reason}`;
  }
  if (action === "status_change") {
    return `${label} ${payload.from} → ${payload.to}`;
  }
  return label;
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<"topup" | "usage" | "audit">(
    "topup"
  );
  const [topups, setTopups] = useState<TopupRecord[]>([]);
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const fetchDetail = useCallback(async () => {
    const res = await fetch(`/api/admin/users/${id}`);
    const data = await res.json();
    if (data.success) {
      setUser(data.data.user);
      setAuditLogs(data.data.auditLogs);
    }
  }, [id]);

  const fetchTopups = useCallback(async () => {
    const res = await fetch(`/api/admin/users/${id}/topups?pageSize=50`);
    const data = await res.json();
    if (data.success) setTopups(data.data.records);
  }, [id]);

  const fetchUsage = useCallback(async () => {
    const res = await fetch(`/api/admin/users/${id}/usage?pageSize=50`);
    const data = await res.json();
    if (data.success) setUsage(data.data.records);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDetail(), fetchTopups(), fetchUsage()]).finally(() =>
      setLoading(false)
    );
  }, [fetchDetail, fetchTopups, fetchUsage]);

  if (loading && !user) {
    return <div className="text-muted text-sm">加载中...</div>;
  }
  if (!user) {
    return <div className="text-muted text-sm">用户不存在</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/users"
          className="text-muted hover:text-fg text-sm"
        >
          ← 返回列表
        </Link>
      </div>

      <div className="p-5 bg-surface border border-border rounded-lg mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-base font-medium text-fg">{user.email}</h1>
            <div className="flex gap-2 mt-2">
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs ${
                  user.status === "active"
                    ? "bg-green-900/30 text-green-400"
                    : "bg-red-900/30 text-red-400"
                }`}
              >
                {user.status === "active" ? "正常" : "封禁"}
              </span>
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs ${
                  user.emailVerified
                    ? "bg-blue-900/30 text-blue-400"
                    : "bg-yellow-900/30 text-yellow-400"
                }`}
              >
                {user.emailVerified ? "已激活" : "未激活"}
              </span>
              {user.hasReceivedBonus && (
                <span className="inline-block px-2 py-0.5 rounded text-xs bg-purple-900/30 text-purple-400">
                  已领注册赠送
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBalanceModal(true)}
              className="px-3 py-1.5 text-sm border border-border rounded text-muted hover:text-fg hover:border-accent transition-colors"
            >
              调整余额
            </button>
            <UserStatusToggle
              userId={user.id}
              currentStatus={user.status}
              onSuccess={(s) => setUser({ ...user, status: s })}
            />
            <button
              onClick={() => setShowResetModal(true)}
              className="px-3 py-1.5 text-sm border border-border rounded text-muted hover:text-fg hover:border-accent transition-colors"
            >
              重置密码
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted">当前余额：</span>
            <span className="text-fg font-medium">
              {user.balance.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-muted">累计消费：</span>
            <span className="text-fg">{user.totalConsumed.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-muted">注册时间：</span>
            <span className="text-fg">
              {new Date(user.createdAt).toLocaleString("zh-CN")}
            </span>
          </div>
          <div>
            <span className="text-muted">最后登录：</span>
            <span className="text-fg">
              {user.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleString("zh-CN")
                : "从未"}
            </span>
          </div>
          <div>
            <span className="text-muted">注册 IP：</span>
            <span className="text-fg font-mono text-xs">
              {user.registerIp || "-"}
            </span>
          </div>
          <div>
            <span className="text-muted">用户 ID：</span>
            <span className="text-fg font-mono text-xs">{user.id}</span>
          </div>
        </div>
      </div>

      <div className="flex border-b border-border mb-4">
        {(
          [
            ["topup", "充值记录"],
            ["usage", "消费记录"],
            ["audit", "操作日志"],
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

      {activeTab === "topup" && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="text-left px-4 py-3 text-muted font-medium">
                  充值码
                </th>
                <th className="text-left px-4 py-3 text-muted font-medium">
                  额度
                </th>
                <th className="text-left px-4 py-3 text-muted font-medium">
                  已用
                </th>
                <th className="text-left px-4 py-3 text-muted font-medium">
                  兑换时间
                </th>
              </tr>
            </thead>
            <tbody>
              {topups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    暂无充值记录
                  </td>
                </tr>
              ) : (
                topups.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-border hover:bg-surface2"
                  >
                    <td className="px-4 py-3 font-mono text-xs">{t.key}</td>
                    <td className="px-4 py-3">{t.totalCredits.toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted">
                      {t.usedCredits.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {t.redeemedAt
                        ? new Date(t.redeemedAt).toLocaleString("zh-CN")
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "usage" && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="text-left px-4 py-3 text-muted font-medium">
                  时间
                </th>
                <th className="text-left px-4 py-3 text-muted font-medium">
                  消耗
                </th>
                <th className="text-left px-4 py-3 text-muted font-medium">
                  Prompt
                </th>
                <th className="text-left px-4 py-3 text-muted font-medium">
                  缩略图
                </th>
              </tr>
            </thead>
            <tbody>
              {usage.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    暂无消费记录
                  </td>
                </tr>
              ) : (
                usage.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-border hover:bg-surface2"
                  >
                    <td className="px-4 py-3 text-muted">
                      {new Date(u.createdAt).toLocaleString("zh-CN")}
                    </td>
                    <td className="px-4 py-3">{u.creditsUsed.toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted truncate max-w-md">
                      {u.promptSummary || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {u.imageUrl ? (
                        <a
                          href={u.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={u.imageUrl}
                            alt="thumb"
                            className="w-10 h-10 object-cover rounded border border-border"
                          />
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="text-left px-4 py-3 text-muted font-medium">
                  时间
                </th>
                <th className="text-left px-4 py-3 text-muted font-medium">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-muted">
                    暂无操作日志
                  </td>
                </tr>
              ) : (
                auditLogs.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-border hover:bg-surface2"
                  >
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleString("zh-CN")}
                    </td>
                    <td className="px-4 py-3">
                      {describeAction(a.action, a.payload)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showBalanceModal && (
        <BalanceAdjustModal
          userId={user.id}
          currentBalance={user.balance}
          onClose={() => setShowBalanceModal(false)}
          onSuccess={(newBalance) => {
            setUser({ ...user, balance: newBalance });
            fetchDetail();
          }}
        />
      )}
      {showResetModal && (
        <ResetPasswordModal
          userId={user.id}
          email={user.email}
          onClose={() => {
            setShowResetModal(false);
            fetchDetail();
          }}
        />
      )}
    </div>
  );
}
