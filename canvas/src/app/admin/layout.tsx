"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin/keys", label: "Key 管理" },
  { href: "/admin/gallery", label: "画廊管理" },
  { href: "/admin/templates", label: "模板管理" },
  { href: "/admin/settings", label: "系统设置" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="w-56 border-r border-border bg-surface flex flex-col">
        <div className="h-14 flex items-center px-5 border-b border-border">
          <span className="text-fg font-medium tracking-wide text-sm">
            CANVAS 管理
          </span>
        </div>
        <nav className="flex-1 py-3">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-5 py-2 text-sm transition-colors ${
                  active
                    ? "text-accent bg-accent-d"
                    : "text-muted hover:text-fg hover:bg-surface2"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
