"use client";

import { useState, useEffect, useCallback } from "react";

interface Category {
  id: number;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export function CategoriesTable() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSort, setEditSort] = useState(0);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSort, setNewSort] = useState(0);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      const json = await res.json();
      if (json.success) setCategories(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => fetchCategories());
  }, [fetchCategories]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, sortOrder: newSort }),
    });
    const json = await res.json();
    if (json.success) {
      setAdding(false);
      setNewName("");
      setNewSort(0);
      await fetchCategories();
    }
  };

  const handleEdit = async (id: number) => {
    if (!editName.trim()) return;
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, sortOrder: editSort }),
    });
    const json = await res.json();
    if (json.success) {
      setEditingId(null);
      await fetchCategories();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该分类？")) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) {
      alert(json.error);
      return;
    }
    await fetchCategories();
  };

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={() => setAdding(true)}
          className="px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent/90"
        >
          新增分类
        </button>
      </div>

      {loading ? (
        <div className="text-muted text-sm">加载中...</div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface2">
              <tr>
                <th className="px-4 py-3 text-left text-muted font-medium">名称</th>
                <th className="px-4 py-3 text-left text-muted font-medium">排序</th>
                <th className="px-4 py-3 text-right text-muted font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {adding && (
                <tr className="bg-surface2/30">
                  <td className="px-4 py-3">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="分类名称"
                      className="bg-surface border border-border rounded px-2 py-1 text-fg text-sm w-40"
                      autoFocus
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={newSort}
                      onChange={(e) => setNewSort(parseInt(e.target.value) || 0)}
                      className="bg-surface border border-border rounded px-2 py-1 text-fg text-sm w-20"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={handleAdd}
                      className="text-accent hover:text-accent/80 text-xs mr-3"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => { setAdding(false); setNewName(""); setNewSort(0); }}
                      className="text-muted hover:text-fg text-xs"
                    >
                      取消
                    </button>
                  </td>
                </tr>
              )}
              {categories.length === 0 && !adding ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted text-sm">
                    暂无分类，点击&ldquo;新增分类&rdquo;添加
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-surface2/50">
                    <td className="px-4 py-3">
                      {editingId === cat.id ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-surface border border-border rounded px-2 py-1 text-fg text-sm w-40"
                          autoFocus
                        />
                      ) : (
                        <span className="text-fg">{cat.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === cat.id ? (
                        <input
                          type="number"
                          value={editSort}
                          onChange={(e) => setEditSort(parseInt(e.target.value) || 0)}
                          className="bg-surface border border-border rounded px-2 py-1 text-fg text-sm w-20"
                        />
                      ) : (
                        <span className="text-muted">{cat.sortOrder}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingId === cat.id ? (
                        <>
                          <button
                            onClick={() => handleEdit(cat.id)}
                            className="text-accent hover:text-accent/80 text-xs mr-3"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-muted hover:text-fg text-xs"
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(cat.id);
                              setEditName(cat.name);
                              setEditSort(cat.sortOrder);
                            }}
                            className="text-accent hover:text-accent/80 text-xs mr-3"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            删除
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
