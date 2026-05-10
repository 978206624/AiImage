"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_LINKS } from "@/lib/constants";
import { SettingsModal } from "./settings-modal";

export function Navbar() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-[200] flex items-center border-b border-border backdrop-blur-[18px]"
        style={{
          height: "var(--nav)",
          padding: "0 40px",
          gap: "8px",
          background: "oklch(13% 0.012 60 / 0.94)",
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

        <button
          onClick={() => setSettingsOpen(true)}
          className="ml-2 w-[34px] h-[34px] rounded-full flex items-center justify-center text-muted hover:text-fg hover:bg-surface transition-colors"
          aria-label="设置"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        <Link
          href="/generate"
          className="ml-2 px-[20px] py-[7px] text-sm font-medium tracking-[.02em] rounded-[var(--r)] hover:opacity-[.86] transition-opacity"
          style={{ background: "var(--accent)", color: "oklch(11% .01 55)" }}
        >
          开始创作
        </Link>
      </header>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
