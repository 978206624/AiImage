"use client";

import { useState, useEffect, useCallback } from "react";
import TemplateModal from "@/components/admin/template-modal";

interface Template {
  id: number;
  name: string;
  prompt: string;
  categoryId: number;
  coverImageUrl: string | null;
  sortOrder: number;
  createdAt: string;
  category: { id: number; name: string };
}

interface TemplateFormData {
  name: string;
  prompt: string;
  categoryId: number;
  coverImageUrl: string;
  sortOrder: number;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/templates?page=${page}&pageSize=20`);
      const json = await res.json();
      if (json.success) {
        setTemplates(json.data.templates);
        setTotal(json.data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleAdd = useCallback(async (data: TemplateFormData) => {
    const res = await fetch("/api/admin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    await fetchTemplates();
  }, [fetchTemplates]);

  const handleEdit = useCallback(
    async (data: TemplateFormData) => {
      if (!editing) return;
      const res = await fetch(`/api/admin/templates/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await fetchTemplates();
    },
    [editing, fetchTemplates]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm("确定删除该模板？")) return;
      await fetch(`/api/admin/templates/${id}`, { method: "DELETE" });
      await fetchTemplates();
    },
    [fetchTemplates]
  );

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-medium text-fg">模板管理</h1>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent/90"
        >
          添加模板
        </button>
      </div>

      {loading ? (
        <div className="text-muted text-sm">加载中...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <p className="text-sm">暂无模板</p>
          <p className="text-xs mt-1">点击"添加模板"创建第一个</p>
        </div>
      ) : (
        <>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface2">
                <tr>
                  <th className="px-4 py-3 text-left text-muted font-medium">封面</th>
                  <th className="px-4 py-3 text-left text-muted font-medium">名称</th>
                  <th className="px-4 py-3 text-left text-muted font-medium">分类</th>
                  <th className="px-4 py-3 text-left text-muted font-medium">Prompt</th>
                  <th className="px-4 py-3 text-left text-muted font-medium">排序</th>
                  <th className="px-4 py-3 text-right text-muted font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {templates.map((tpl) => (
                  <tr key={tpl.id} className="hover:bg-surface2/50">
                    <td className="px-4 py-3">
                      {tpl.coverImageUrl ? (
                        <img
                          src={tpl.coverImageUrl}
                          alt=""
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-surface2 rounded flex items-center justify-center text-muted text-xs">
                          无
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-fg">{tpl.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded">
                        {tpl.category.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted max-w-[200px] truncate">
                      {tpl.prompt}
                    </td>
                    <td className="px-4 py-3 text-muted">{tpl.sortOrder}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setEditing(tpl);
                          setModalOpen(true);
                        }}
                        className="text-accent hover:text-accent/80 text-xs mr-3"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(tpl.id)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted">共 {total} 条</span>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded text-xs ${
                      p === page
                        ? "bg-accent text-white"
                        : "text-muted hover:bg-surface2"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <TemplateModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={editing ? handleEdit : handleAdd}
        initial={
          editing
            ? {
                name: editing.name,
                prompt: editing.prompt,
                categoryId: editing.categoryId,
                coverImageUrl: editing.coverImageUrl || "",
                sortOrder: editing.sortOrder,
              }
            : undefined
        }
        title={editing ? "编辑模板" : "添加模板"}
      />
    </div>
  );
}
