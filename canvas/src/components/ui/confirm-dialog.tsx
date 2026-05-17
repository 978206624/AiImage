"use client";

import { useEffect, type ReactNode } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title = "确认操作",
  message,
  confirmText = "确认",
  cancelText = "取消",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (loading) return;
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => {
        if (!loading) onCancel();
      }}
      role="presentation"
    >
      <div
        className="w-full max-w-sm p-6 bg-surface border border-border rounded-[var(--r)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <h2
          id="confirm-dialog-title"
          className="text-base font-medium text-fg mb-2"
        >
          {title}
        </h2>
        <div className="text-sm text-muted leading-relaxed mb-5">{message}</div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-1.5 text-sm border border-border text-muted rounded hover:text-fg hover:border-accent transition-colors disabled:opacity-40"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            autoFocus
            className={`px-4 py-1.5 text-sm font-medium rounded transition-colors disabled:opacity-50 ${
              danger
                ? "bg-red-500/15 text-red-400 border border-red-500/40 hover:bg-red-500/25"
                : "bg-accent text-bg hover:opacity-90"
            }`}
          >
            {loading ? "处理中..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
