"use client";

import { useState } from "react";

interface Props {
  userId: number;
  currentBalance: number;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

export function BalanceAdjustModal({
  userId,
  currentBalance,
  onClose,
  onSuccess,
}: Props) {
  const [direction, setDirection] = useState<"add" | "subtract">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("请输入大于 0 的数字");
      return;
    }
    const delta = direction === "add" ? value : -value;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta, reason }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(data.data.balance);
        onClose();
      } else {
        setError(data.error || "操作失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-lg w-full max-w-md p-6">
        <h2 className="text-base font-medium text-fg mb-4">调整余额</h2>
        <div className="text-sm text-muted mb-4">
          当前余额：<span className="text-fg">{currentBalance.toFixed(2)}</span>
        </div>
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDirection("add")}
              className={`flex-1 px-3 py-2 text-sm rounded border transition-colors ${
                direction === "add"
                  ? "border-accent text-accent bg-accent-d"
                  : "border-border text-muted hover:text-fg"
              }`}
            >
              增加
            </button>
            <button
              type="button"
              onClick={() => setDirection("subtract")}
              className={`flex-1 px-3 py-2 text-sm rounded border transition-colors ${
                direction === "subtract"
                  ? "border-accent text-accent bg-accent-d"
                  : "border-border text-muted hover:text-fg"
              }`}
            >
              扣减
            </button>
          </div>
          <div>
            <label className="block text-sm text-muted mb-1.5">数额</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.21"
              min="0"
              step="0.01"
              className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1.5">
              原因（可选）
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="客服补偿 / 异常扣减..."
              className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm focus:outline-none focus:border-accent"
            />
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
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 bg-accent text-bg text-sm font-medium rounded hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "处理中..." : "确认"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
