"use client";

import { useState, useEffect, useCallback } from "react";

interface WorkerStats {
  activeWorkers: number;
  workerActiveTasks: number;
  processingTasks: number;
  pendingTasks: number;
  failedTasks24h: number;
  stuckTasks: number;
  circuitBreakers: {
    provider: string;
    isOpen: boolean;
    failureCount: number;
  }[];
}

export default function AdminWorkerPage() {
  const [stats, setStats] = useState<WorkerStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/worker/stats");
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => fetchStats());
    const interval = setInterval(() => {
      void fetchStats();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-muted">加载中...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-muted">无法加载 Worker 状态</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-fg">Worker 状态监控</h1>
        <button
          onClick={() => void fetchStats()}
          className="px-4 py-2 text-sm text-muted hover:text-fg border border-border rounded"
        >
          刷新
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-sm text-muted mb-1">活跃 Worker</div>
          <div className="text-2xl font-medium text-fg">{stats.activeWorkers}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-sm text-muted mb-1">Worker 执行中</div>
          <div className="text-2xl font-medium text-fg">{stats.workerActiveTasks ?? 0}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-sm text-muted mb-1">处理中任务</div>
          <div className="text-2xl font-medium text-fg">{stats.processingTasks}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-sm text-muted mb-1">待处理任务</div>
          <div className="text-2xl font-medium text-yellow-400">{stats.pendingTasks}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-sm text-muted mb-1">24h 失败任务</div>
          <div className="text-2xl font-medium text-red-400">{stats.failedTasks24h}</div>
        </div>
      </div>

      {stats.stuckTasks > 0 && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-900/30 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-red-400 text-lg">⚠️</span>
            <div>
              <div className="text-red-400 font-medium">
                发现 {stats.stuckTasks} 个卡住的任务
              </div>
              <div className="text-sm text-muted mt-1">
                这些任务处于 processing 状态但已超时。请检查 Worker 是否正常运行。
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-surface border border-border rounded-lg p-4">
        <h2 className="text-lg font-medium text-fg mb-4">Provider 熔断状态</h2>

        {stats.circuitBreakers.length === 0 ? (
          <div className="text-muted text-center py-4">暂无熔断记录</div>
        ) : (
          <div className="space-y-3">
            {stats.circuitBreakers.map((cb) => (
              <div
                key={cb.provider}
                className={`p-4 rounded-lg border ${
                  cb.isOpen
                    ? "bg-red-900/20 border-red-900/30"
                    : "bg-surface2 border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-fg">{cb.provider}</div>
                    <div className="text-sm text-muted">
                      连续失败: {cb.failureCount} 次
                    </div>
                  </div>
                  <div>
                    {cb.isOpen ? (
                      <span className="inline-block px-3 py-1 bg-red-900/30 text-red-400 rounded text-sm">
                        熔断中
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 bg-green-900/30 text-green-400 rounded text-sm">
                        正常
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-surface2 border border-border rounded-lg">
        <h2 className="text-sm font-medium text-fg mb-3">说明</h2>
        <ul className="text-sm text-muted space-y-1">
          <li>• Worker 负责处理 source=worker 的生图任务</li>
          <li>• 熔断机制：在连续 5 次失败后触发，5 分钟后自动恢复</li>
          <li>• Stuck 任务：processing 状态超过 60 秒的任务，可能是 Worker 崩溃导致</li>
          <li>• 请在任务管理页面手动处理 stuck 和失败任务</li>
        </ul>
      </div>
    </div>
  );
}
