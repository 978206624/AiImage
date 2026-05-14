"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/lib/constants";
import { useCurrentUser } from "@/hooks/use-current-user";
import { BalanceBadge } from "./balance-badge";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "./theme-toggle";

export function Navbar() {
  const pathname = usePathname();
  const { user, loading } = useCurrentUser();

  if (pathname.startsWith("/admin")) return null;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[200] flex items-center border-b border-border bg-bg/94 backdrop-blur-[18px]"
      style={{
        height: "var(--nav)",
        padding: "0 40px",
        gap: "8px",
      }}
    >
      <Link
        href="/"
        className="text-[18px] font-normal tracking-[0.12em] uppercase"
        style={{ fontFamily: "var(--font-d)", marginRight: "auto" }}
      >
        CAN<span className="text-accent not-italic">◈</span>VAS
      </Link>

      <nav className="flex gap-[2px]">
        {NAV_LINKS.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-[15px] py-[6px] text-sm rounded-[5px] tracking-[.01em] transition-colors ${
                active
                  ? "text-accent bg-accent-d"
                  : "text-muted hover:text-fg hover:bg-surface"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-2 flex items-center gap-2">
        {loading ? (
          <div className="w-[34px] h-[34px]" aria-hidden="true" />
        ) : user ? (
          <>
            <BalanceBadge balance={user.balance} />
            <UserMenu email={user.email} />
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="px-3 h-[34px] flex items-center text-sm text-muted hover:text-fg transition-colors"
            >
              登录
            </Link>
            <Link
              href="/register"
              className="px-3 h-[34px] flex items-center text-sm text-fg border border-border rounded-[var(--r)] hover:border-accent transition-colors"
            >
              注册
            </Link>
          </>
        )}

        <ThemeToggle />

        <Link
          href="/generate"
          className="px-[20px] py-[7px] text-sm font-medium tracking-[.02em] rounded-[var(--r)] hover:opacity-[.86] transition-opacity"
          style={{ background: "var(--accent)", color: "oklch(11% .01 55)" }}
        >
          开始创作
        </Link>
      </div>
    </header>
  );
}
