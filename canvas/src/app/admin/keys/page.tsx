"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface ApiKey {
  id: number;
  key: string;
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  status: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function AdminKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genCount, setGenCount] = useState("10");
  const [genCredits, setGenCredits] = useState("10");
  const [generating, setGenerating] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/keys?page=${page}&pageSize=20`);
      const data = await res.json();
      if (data.success) {
        setKeys(data.data.keys);
        setTotal(data.data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: parseInt(genCount),
          credits: parseFloat(genCredits),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedKeys(data.data.keys.map((k: { key: string }) => k.key));
        fetchKeys();
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleToggleStatus(id: number, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "disabled" : "active";
    await fetch(`/api/admin/keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchKeys();
  }

  function copyKeys() {
    navigator.clipboard.writeText(generatedKeys.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-fg">Key 管理</h1>
        <button
          onClick={() => {
            setShowGenerate(true);
            setGeneratedKeys([]);
          }}
          className="px-4 py-2 bg-accent text-bg text-sm font-medium rounded hover:opacity-90 transition-opacity"
        >
          批量生成
        </button>
      </div>

      {showGenerate && (
        <div className="mb-6 p-5 bg-surface border border-border rounded-lg">
          {generatedKeys.length === 0 ? (
            <div className="flex items-end gap-4">
              <div>
                <label className="block text-sm text-muted mb-1">数量</label>
                <input
                  type="number"
                  value={genCount}
                  onChange={(e) => setGenCount(e.target.value)}
                  className="w-24 px-3 py-2 bg-bg border border-border rounded text-fg text-sm focus:outline-none focus:border-accent"
                  min="1"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">
                  每个 Key 积分
                </label>
                <input
                  type="number"
                  value={genCredits}
                  onChange={(e) => setGenCredits(e.target.value)}
                  className="w-32 px-3 py-2 bg-bg border border-border rounded text-fg text-sm focus:outline-none focus:border-accent"
                  min="0.01"
                  step="0.01"
                />
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-2 bg-accent text-bg text-sm font-medium rounded hover:opacity-90 disabled:opacity-50"
              >
                {generating ? "生成中..." : "确认生成"}
              </button>
              <button
                onClick={() => setShowGenerate(false)}
                className="px-4 py-2 text-muted text-sm hover:text-fg"
              >
                取消
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-fg">
                  已生成 {generatedKeys.length} 个 Key
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={copyKeys}
                    className="px-3 py-1.5 bg-accent text-bg text-sm rounded hover:opacity-90"
                  >
                    {copied ? "已复制" : "复制全部"}
                  </button>
                  <button
                    onClick={() => setShowGenerate(false)}
                    className="px-3 py-1.5 text-muted text-sm hover:text-fg"
                  >
                    关闭
                  </button>
                </div>
              </div>
              <pre className="p-3 bg-bg border border-border rounded text-xs text-fg font-mono max-h-48 overflow-auto">
                {generatedKeys.join("\n")}
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface border-b border-border">
              <th className="text-left px-4 py-3 text-muted font-medium">
                Key
              </th>
              <th className="text-left px-4 py-3 text-muted font-medium">
                总积分
              </th>
              <th className="text-left px-4 py-3 text-muted font-medium">
                剩余
              </th>
              <th className="text-left px-4 py-3 text-muted font-medium">
                状态
              </th>
              <th className="text-left px-4 py-3 text-muted font-medium">
                创建时间
              </th>
              <th className="text-left px-4 py-3 text-muted font-medium">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  加载中...
                </td>
              </tr>
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  暂无 Key，点击"批量生成"创建
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr
                  key={k.id}
                  className="border-b border-border hover:bg-surface2 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs">{k.key}</td>
                  <td className="px-4 py-3">{k.totalCredits}</td>
                  <td className="px-4 py-3">{k.remainingCredits.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs ${
                        k.status === "active"
                          ? "bg-green-900/30 text-green-400"
                          : "bg-red-900/30 text-red-400"
                      }`}
                    >
                      {k.status === "active" ? "启用" : "禁用"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(k.createdAt).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleStatus(k.id, k.status)}
                        className="text-xs text-muted hover:text-fg"
                      >
                        {k.status === "active" ? "禁用" : "启用"}
                      </button>
                      <Link
                        href={`/admin/keys/${k.id}`}
                        className="text-xs text-accent hover:opacity-80"
                      >
                        详情
                      </Link>
                    </div>
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
