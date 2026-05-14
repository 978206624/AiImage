"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface UserRow {
  id: number;
  email: string;
  balance: number;
  totalConsumed: number;
  emailVerified: boolean;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
}

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "全部" },
  { value: "active", label: "正常" },
  { value: "banned", label: "封禁" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "20");
      if (q) params.set("q", q);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.data.users);
        setTotal(data.data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, q, statusFilter]);

  useEffect(() => {
    void Promise.resolve().then(() => fetchUsers());
  }, [fetchUsers]);

  function applySearch() {
    setQ(searchInput.trim());
    setPage(1);
  }

  function selectStatus(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-fg">用户管理</h1>
        <div className="text-sm text-muted">共 {total} 个用户</div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applySearch();
            }}
            placeholder="按邮箱搜索"
            className="w-64 px-3 py-2 bg-bg border border-border rounded text-fg text-sm focus:outline-none focus:border-accent"
          />
          <button
            onClick={applySearch}
            className="px-3 py-2 text-sm border border-border rounded text-muted hover:text-fg hover:border-accent"
          >
            搜索
          </button>
          {q && (
            <button
              onClick={() => {
                setSearchInput("");
                setQ("");
                setPage(1);
              }}
              className="px-3 py-2 text-sm text-muted hover:text-fg"
            >
              清除
            </button>
          )}
        </div>
        <div className="flex gap-1.5 ml-auto">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value || "all"}
              onClick={() => selectStatus(opt.value)}
              className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                statusFilter === opt.value
                  ? "border-accent text-accent bg-accent-d"
                  : "border-border text-muted hover:text-fg"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface border-b border-border">
              <th className="text-left px-4 py-3 text-muted font-medium">
                邮箱
              </th>
              <th className="text-left px-4 py-3 text-muted font-medium">
                当前余额
              </th>
              <th className="text-left px-4 py-3 text-muted font-medium">
                累计消费
              </th>
              <th className="text-left px-4 py-3 text-muted font-medium">
                注册时间
              </th>
              <th className="text-left px-4 py-3 text-muted font-medium">
                最后登录
              </th>
              <th className="text-left px-4 py-3 text-muted font-medium">
                状态
              </th>
              <th className="text-left px-4 py-3 text-muted font-medium">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  加载中...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  没有匹配的用户
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-border hover:bg-surface2 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="text-fg">{u.email}</span>
                    {!u.emailVerified && (
                      <span className="ml-2 px-1.5 py-0.5 bg-yellow-900/30 text-yellow-400 text-[10px] rounded">
                        未激活
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{u.balance.toFixed(2)}</td>
                  <td className="px-4 py-3 text-muted">
                    {u.totalConsumed.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleString("zh-CN")
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs ${
                        u.status === "active"
                          ? "bg-green-900/30 text-green-400"
                          : "bg-red-900/30 text-red-400"
                      }`}
                    >
                      {u.status === "active" ? "正常" : "封禁"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-xs text-accent hover:opacity-80"
                    >
                      详情
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted">
            第 {page}/{totalPages} 页
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-border rounded text-muted hover:text-fg disabled:opacity-50"
            >
              上一页
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-border rounded text-muted hover:text-fg disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
