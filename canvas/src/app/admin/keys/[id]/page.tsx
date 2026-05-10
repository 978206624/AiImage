"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface KeyInfo {
  id: number;
  key: string;
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  status: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface UsageRecord {
  id: number;
  creditsUsed: number;
  promptSummary: string | null;
  createdAt: string;
}

export default function KeyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [keyRes, usageRes] = await Promise.all([
        fetch(`/api/admin/keys?page=1&pageSize=999`),
        fetch(`/api/admin/keys/${id}/usage?page=${page}&pageSize=20`),
      ]);

      const keyData = await keyRes.json();
      if (keyData.success) {
        const found = keyData.data.keys.find(
          (k: KeyInfo) => k.id === parseInt(id)
        );
        if (found) setKeyInfo(found);
      }

      const usageData = await usageRes.json();
      if (usageData.success) {
        setRecords(usageData.data.records);
        setTotal(usageData.data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !keyInfo) {
    return <div className="text-muted text-sm">加载中...</div>;
  }

  if (!keyInfo) {
    return <div className="text-muted text-sm">Key 不存在</div>;
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/keys"
          className="text-muted hover:text-fg text-sm"
        >
          ← 返回列表
        </Link>
      </div>

      <div className="p-5 bg-surface border border-border rounded-lg mb-6">
        <h1 className="text-lg font-medium text-fg mb-4 font-mono">
          {keyInfo.key}
        </h1>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted">总积分：</span>
            <span className="text-fg">{keyInfo.totalCredits}</span>
          </div>
          <div>
            <span className="text-muted">剩余积分：</span>
            <span className="text-fg">
              {keyInfo.remainingCredits.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-muted">状态：</span>
            <span
              className={
                keyInfo.status === "active" ? "text-green-400" : "text-red-400"
              }
            >
              {keyInfo.status === "active" ? "启用" : "禁用"}
            </span>
          </div>
          <div>
            <span className="text-muted">创建时间：</span>
            <span className="text-fg">
              {new Date(keyInfo.createdAt).toLocaleString("zh-CN")}
            </span>
          </div>
        </div>
      </div>

      <h2 className="text-base font-medium text-fg mb-4">使用记录</h2>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface border-b border-border">
              <th className="text-left px-4 py-3 text-muted font-medium">
                时间
              </th>
              <th className="text-left px-4 py-3 text-muted font-medium">
                消耗积分
              </th>
              <th className="text-left px-4 py-3 text-muted font-medium">
                Prompt 摘要
              </th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted">
                  暂无使用记录
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border hover:bg-surface2 transition-colors"
                >
                  <td className="px-4 py-3 text-muted">
                    {new Date(r.createdAt).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-4 py-3">{r.creditsUsed}</td>
                  <td className="px-4 py-3 text-muted truncate max-w-xs">
                    {r.promptSummary || "-"}
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
            共 {total} 条，第 {page}/{totalPages} 页
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
