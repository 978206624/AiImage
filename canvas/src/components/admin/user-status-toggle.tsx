"use client";

import { useState } from "react";

interface Props {
  userId: number;
  currentStatus: string;
  onSuccess: (newStatus: string) => void;
}

export function UserStatusToggle({
  userId,
  currentStatus,
  onSuccess,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function toggle() {
    const next = currentStatus === "active" ? "banned" : "active";
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(next);
      }
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="text-xs text-muted">
          确认{currentStatus === "active" ? "封禁" : "解封"}？
        </span>
        <button
          onClick={toggle}
          disabled={submitting}
          className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "..." : "确认"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={submitting}
          className="px-2 py-1 text-xs text-muted hover:text-fg"
        >
          取消
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-3 py-1.5 text-sm border border-border rounded text-muted hover:text-fg hover:border-accent transition-colors"
    >
      {currentStatus === "active" ? "封禁账号" : "解封账号"}
    </button>
  );
}
