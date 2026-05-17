"use client";

import Link from "next/link";
import { useEffect } from "react";

interface InsufficientBalanceModalProps {
  open: boolean;
  balance: number;
  required: number;
  onClose: () => void;
}

export function InsufficientBalanceModal({
  open,
  balance,
  required,
  onClose,
}: InsufficientBalanceModalProps) {
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
        <h2 className="text-lg font-medium text-fg mb-1">积分不足</h2>
        <p className="text-sm text-muted leading-relaxed mb-5">
          本次生图需要 {required.toFixed(2)} 积分，当前余额{" "}
          {balance.toFixed(2)} 积分。
        </p>

        <div className="p-4 bg-bg border border-border rounded mb-5">
          <p className="text-xs text-muted leading-relaxed">
            前往账号中心兑换充值码即可继续创作。如尚未购买，可前往淘宝搜索
            「Mira 充值码」购买。
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/account"
            className="flex-1 py-2 bg-accent text-bg text-sm font-medium rounded text-center hover:opacity-90 transition-opacity"
          >
            去兑换
          </Link>
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-border text-fg text-sm font-medium rounded hover:border-accent transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
