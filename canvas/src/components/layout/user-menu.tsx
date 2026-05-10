"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";

interface UserMenuProps {
  email: string;
}

export function UserMenu({ email }: UserMenuProps) {
  const router = useRouter();
  const { refresh } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = email.charAt(0).toUpperCase();

  async function handleLogout() {
    setOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      await refresh();
      router.push("/");
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-fg bg-surface border border-border hover:border-accent transition-colors text-sm font-medium"
        aria-label="账号菜单"
        aria-expanded={open}
      >
        {initial}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 min-w-[180px] py-1.5 bg-surface border border-border rounded-[var(--r)] shadow-lg z-[210]"
          role="menu"
        >
          <div
            className="px-3 py-2 text-xs text-muted border-b border-border truncate"
            title={email}
          >
            {email}
          </div>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-fg hover:bg-bg transition-colors"
            role="menuitem"
          >
            账号中心
          </Link>
          <Link
            href="/history"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-fg hover:bg-bg transition-colors"
            role="menuitem"
          >
            历史记录
          </Link>
          <button
            onClick={handleLogout}
            className="block w-full text-left px-3 py-2 text-sm text-muted hover:bg-bg hover:text-fg transition-colors"
            role="menuitem"
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
