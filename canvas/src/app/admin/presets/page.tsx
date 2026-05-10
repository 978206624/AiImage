"use client";

import { useState, useEffect, useCallback } from "react";
import PresetModal from "@/components/admin/preset-modal";

interface Preset {
  id: number;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  promptPrefix: string;
  sortOrder: number;
  createdAt: string;
}

interface PresetFormData {
  name: string;
  description: string;
  coverImageUrl: string;
  promptPrefix: string;
  sortOrder: number;
}

export default function PresetsPage() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Preset | null>(null);

  const fetchPresets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/presets");
      const json = await res.json();
      if (json.success) setPresets(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  const handleAdd = useCallback(async (data: PresetFormData) => {
    const res = await fetch("/api/admin/presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    await fetchPresets();
  }, [fetchPresets]);

  const handleEdit = useCallback(
    async (data: PresetFormData) => {
      if (!editing) return;
      const res = await fetch(`/api/admin/presets/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await fetchPresets();
    },
    [editing, fetchPresets]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm("确定删除该预设？")) return;
      await fetch(`/api/admin/presets/${id}`, { method: "DELETE" });
      await fetchPresets();
    },
    [fetchPresets]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-medium text-fg">风格预设管理</h1>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent/90"
        >
          添加预设
        </button>
      </div>

      {loading ? (
        <div className="text-muted text-sm">加载中...</div>
      ) : presets.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <p className="text-sm">暂无风格预设</p>
          <p className="text-xs mt-1">点击"添加预设"创建第一个</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface2">
              <tr>
                <th className="px-4 py-3 text-left text-muted font-medium">封面</th>
                <th className="px-4 py-3 text-left text-muted font-medium">名称</th>
                <th className="px-4 py-3 text-left text-muted font-medium">描述</th>
                <th className="px-4 py-3 text-left text-muted font-medium">Prompt 前缀</th>
                <th className="px-4 py-3 text-left text-muted font-medium">排序</th>
                <th className="px-4 py-3 text-right text-muted font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {presets.map((preset) => (
                <tr key={preset.id} className="hover:bg-surface2/50">
                  <td className="px-4 py-3">
                    {preset.coverImageUrl ? (
                      <img
                        src={preset.coverImageUrl}
                        alt=""
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-surface2 rounded flex items-center justify-center text-muted text-xs">
                        无
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-fg">{preset.name}</td>
                  <td className="px-4 py-3 text-muted max-w-[150px] truncate">
                    {preset.description || "-"}
                  </td>
                  <td className="px-4 py-3 text-muted max-w-[200px] truncate">
                    {preset.promptPrefix}
                  </td>
                  <td className="px-4 py-3 text-muted">{preset.sortOrder}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setEditing(preset);
                        setModalOpen(true);
                      }}
                      className="text-accent hover:text-accent/80 text-xs mr-3"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(preset.id)}
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
      )}

      <PresetModal
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
                description: editing.description || "",
                coverImageUrl: editing.coverImageUrl || "",
                promptPrefix: editing.promptPrefix,
                sortOrder: editing.sortOrder,
              }
            : undefined
        }
        title={editing ? "编辑预设" : "添加预设"}
      />
    </div>
  );
}
