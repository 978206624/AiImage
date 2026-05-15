"use client";

import { useState, useEffect, useCallback } from "react";

interface Task {
  id: number;
  userId: number;
  groupId: string;
  status: string;
  provider: string | null;
  model: string | null;
  promptSummary: string;
  aspectRatio: string;
  quality: string;
  size: string;
  creditsLocked: string;
  progress: number;
  failReason: string | null;
  upstreamRaw: string | null;
  attemptCount: number;
  source: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  user: {
    email: string;
  };
}

const STATUS_LABELS: Record<string, { text: string; cls: string }> = {
  pending: { text: "待处理", cls: "bg-yellow-900/30 text-yellow-400" },
  processing: { text: "处理中", cls: "bg-blue-900/30 text-blue-400" },
  submitted: { text: "已提交", cls: "bg-blue-900/30 text-blue-400" },
  completed: { text: "已完成", cls: "bg-green-900/30 text-green-400" },
  failed: { text: "失败", cls: "bg-red-900/30 text-red-400" },
};

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/tasks?${params}`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.data.tasks);
        setTotal(data.data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void Promise.resolve().then(() => fetchTasks());
  }, [fetchTasks]);

  async function handleAction(taskId: number, action: string) {
    await fetch(`/api/admin/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await fetchTasks();
    setSelectedTask(null);
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium text-fg">生图任务管理</h1>
        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-bg border border-border rounded text-fg text-sm focus:outline-none focus:border-accent"
          >
            <option value="">全部状态</option>
            <option value="pending">待处理</option>
            <option value="processing">处理中</option>
            <option value="submitted">已提交</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
          </select>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface border-b border-border">
              <th className="text-left px-4 py-3 text-muted font-medium">ID</th>
              <th className="text-left px-4 py-3 text-muted font-medium">用户</th>
              <th className="text-left px-4 py-3 text-muted font-medium">模型</th>
              <th className="text-left px-4 py-3 text-muted font-medium">状态</th>
              <th className="text-left px-4 py-3 text-muted font-medium">进度</th>
              <th className="text-left px-4 py-3 text-muted font-medium">来源</th>
              <th className="text-left px-4 py-3 text-muted font-medium">创建时间</th>
              <th className="text-left px-4 py-3 text-muted font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  加载中...
                </td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  暂无任务
                </td>
              </tr>
            ) : (
              tasks.map((task) => {
                const statusInfo = STATUS_LABELS[task.status] ?? {
                  text: task.status,
                  cls: "bg-gray-900/30 text-gray-400",
                };
                return (
                  <tr
                    key={task.id}
                    className="border-b border-border hover:bg-surface2 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs">{task.id}</td>
                    <td className="px-4 py-3 text-muted truncate max-w-[150px]">
                      {task.user.email}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">{task.model ?? "-"}</div>
                      <div className="text-xs text-muted">{task.provider ?? "-"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs ${statusInfo.cls}`}>
                        {statusInfo.text}
                      </span>
                    </td>
                    <td className="px-4 py-3">{task.progress}%</td>
                    <td className="px-4 py-3 text-xs">
                      {task.source === "worker" ? (
                        <span className="text-green-400">Worker</span>
                      ) : (
                        <span className="text-blue-400">Poll</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {new Date(task.createdAt).toLocaleString("zh-CN")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedTask(task)}
                          className="text-xs text-accent hover:opacity-80"
                        >
                          详情
                        </button>
                        {task.status === "failed" && (
                          <button
                            onClick={() => handleAction(task.id, "retry")}
                            className="text-xs text-blue-400 hover:opacity-80"
                          >
                            重试
                          </button>
                        )}
                        {(task.status === "pending" || task.status === "processing") && (
                          <button
                            onClick={() => handleAction(task.id, "reset")}
                            className="text-xs text-yellow-400 hover:opacity-80"
                          >
                            重置
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
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

      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-lg w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-fg">任务详情 #{selectedTask.id}</h2>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-muted hover:text-fg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-muted">用户</div>
                  <div className="text-fg">{selectedTask.user.email}</div>
                </div>
                <div>
                  <div className="text-muted">状态</div>
                  <div className={`inline-block px-2 py-0.5 rounded text-xs ${
                    STATUS_LABELS[selectedTask.status]?.cls ?? ""
                  }`}>
                    {STATUS_LABELS[selectedTask.status]?.text ?? selectedTask.status}
                  </div>
                </div>
                <div>
                  <div className="text-muted">Provider</div>
                  <div className="text-fg">{selectedTask.provider ?? "-"}</div>
                </div>
                <div>
                  <div className="text-muted">模型</div>
                  <div className="text-fg">{selectedTask.model ?? "-"}</div>
                </div>
                <div>
                  <div className="text-muted">来源</div>
                  <div className="text-fg">{selectedTask.source}</div>
                </div>
                <div>
                  <div className="text-muted">重试次数</div>
                  <div className="text-fg">{selectedTask.attemptCount}</div>
                </div>
                <div>
                  <div className="text-muted">尺寸</div>
                  <div className="text-fg">{selectedTask.size}</div>
                </div>
                <div>
                  <div className="text-muted">质量</div>
                  <div className="text-fg">{selectedTask.quality}</div>
                </div>
                <div>
                  <div className="text-muted">积分</div>
                  <div className="text-fg">{Number(selectedTask.creditsLocked).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted">进度</div>
                  <div className="text-fg">{selectedTask.progress}%</div>
                </div>
              </div>

              <div>
                <div className="text-muted">Prompt</div>
                <div className="text-fg bg-bg p-2 rounded mt-1 break-all">
                  {selectedTask.promptSummary}
                </div>
              </div>

              {selectedTask.failReason && (
                <div>
                  <div className="text-muted">失败原因</div>
                  <div className="text-red-400 bg-red-900/10 p-2 rounded mt-1">
                    {selectedTask.failReason}
                  </div>
                </div>
              )}

              {selectedTask.upstreamRaw && (
                <div>
                  <div className="text-muted">上游响应</div>
                  <pre className="text-xs text-fg bg-bg p-2 rounded mt-1 overflow-x-auto">
                    {selectedTask.upstreamRaw}
                  </pre>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-muted">创建时间</div>
                  <div className="text-fg text-xs">
                    {new Date(selectedTask.createdAt).toLocaleString("zh-CN")}
                  </div>
                </div>
                <div>
                  <div className="text-muted">完成时间</div>
                  <div className="text-fg text-xs">
                    {selectedTask.finishedAt
                      ? new Date(selectedTask.finishedAt).toLocaleString("zh-CN")
                      : "-"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              {selectedTask.status === "failed" && (
                <button
                  onClick={() => handleAction(selectedTask.id, "retry")}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  重试任务
                </button>
              )}
              {(selectedTask.status === "pending" || selectedTask.status === "processing") && (
                <button
                  onClick={() => handleAction(selectedTask.id, "reset")}
                  className="px-4 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                >
                  重置任务
                </button>
              )}
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 text-muted text-sm hover:text-fg"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
