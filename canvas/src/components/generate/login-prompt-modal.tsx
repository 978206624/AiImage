"use client";

import Link from "next/link";
import { useEffect } from "react";

interface LoginPromptModalProps {
  open: boolean;
  onClose: () => void;
}

export function LoginPromptModal({ open, onClose }: LoginPromptModalProps) {
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
        <h2 className="text-lg font-medium text-fg mb-1">登录后开始创作</h2>
        <p className="text-sm text-muted leading-relaxed mb-6">
          注册即赠送 0.21 积分，可生成 3 张图免费体验。
        </p>

        <div className="flex gap-2">
          <Link
            href="/login?redirect=/generate"
            className="flex-1 py-2 bg-accent text-bg text-sm font-medium rounded text-center hover:opacity-90 transition-opacity"
          >
            去登录
          </Link>
          <Link
            href="/register"
            className="flex-1 py-2 border border-border text-fg text-sm font-medium rounded text-center hover:border-accent transition-colors"
          >
            去注册
          </Link>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full text-xs text-muted hover:text-fg transition-colors"
        >
          稍后再说
        </button>
      </div>
    </div>
  );
}
