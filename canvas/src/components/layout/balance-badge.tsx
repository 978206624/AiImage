"use client";

import Link from "next/link";

interface BalanceBadgeProps {
  balance: number;
}

export function BalanceBadge({ balance }: BalanceBadgeProps) {
  return (
    <Link
      href="/account"
      className="flex items-center gap-1.5 px-3 h-[34px] rounded-[var(--r)] border border-border text-fg hover:border-accent transition-colors"
      title="查看余额详情"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-accent"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v12" />
        <path d="M9 9h4.5a2.5 2.5 0 0 1 0 5H9" />
        <path d="M9 14h5" />
      </svg>
      <span className="text-sm tabular-nums">{balance.toFixed(2)}</span>
    </Link>
  );
}
