"use client";

import { useState, useEffect, useCallback } from "react";
import GalleryModal from "@/components/admin/gallery-modal";

interface GalleryImage {
  id: number;
  imageUrl: string;
  prompt: string | null;
  modelTag: string;
  styleTag: string;
  width: number | null;
  height: number | null;
  isFeatured: boolean;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
}

interface GalleryFormData {
  imageUrl: string;
  prompt: string;
  modelTag: string;
  styleTag: string;
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/gallery?page=${page}&pageSize=20`);
      const json = await res.json();
      if (json.success) {
        setImages(json.data.images);
        setTotal(json.data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleAdd = useCallback(async (data: GalleryFormData) => {
    const res = await fetch("/api/admin/gallery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    await fetchImages();
  }, [fetchImages]);

  const handleEdit = useCallback(
    async (data: GalleryFormData) => {
      if (!editingImage) return;
      const res = await fetch(`/api/admin/gallery/${editingImage.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await fetchImages();
    },
    [editingImage, fetchImages]
  );

  const handleToggle = useCallback(
    async (id: number, field: "isPublished" | "isFeatured", value: boolean) => {
      await fetch(`/api/admin/gallery/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      await fetchImages();
    },
    [fetchImages]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm("确定删除这张图片？")) return;
      await fetch(`/api/admin/gallery/${id}`, { method: "DELETE" });
      await fetchImages();
    },
    [fetchImages]
  );

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-medium text-fg">画廊管理</h1>
        <button
          onClick={() => {
            setEditingImage(null);
            setModalOpen(true);
          }}
          className="px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent/90"
        >
          添加图片
        </button>
      </div>

      {loading ? (
        <div className="text-muted text-sm">加载中...</div>
      ) : images.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <p className="text-sm">暂无画廊图片</p>
          <p className="text-xs mt-1">点击"添加图片"上传第一张</p>
        </div>
      ) : (
        <>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface2">
                <tr>
                  <th className="px-4 py-3 text-left text-muted font-medium">图片</th>
                  <th className="px-4 py-3 text-left text-muted font-medium">Prompt</th>
                  <th className="px-4 py-3 text-left text-muted font-medium">模型</th>
                  <th className="px-4 py-3 text-left text-muted font-medium">风格</th>
                  <th className="px-4 py-3 text-center text-muted font-medium">精选</th>
                  <th className="px-4 py-3 text-center text-muted font-medium">上架</th>
                  <th className="px-4 py-3 text-right text-muted font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {images.map((img) => (
                  <tr key={img.id} className="hover:bg-surface2/50">
                    <td className="px-4 py-3">
                      <img
                        src={img.imageUrl}
                        alt=""
                        className="w-16 h-16 object-cover rounded"
                      />
                    </td>
                    <td className="px-4 py-3 text-fg max-w-[200px] truncate">
                      {img.prompt || "-"}
                    </td>
                    <td className="px-4 py-3 text-muted">{img.modelTag}</td>
                    <td className="px-4 py-3 text-muted">{img.styleTag}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(img.id, "isFeatured", !img.isFeatured)}
                        className={`w-5 h-5 rounded border ${
                          img.isFeatured
                            ? "bg-accent border-accent text-white"
                            : "border-border text-transparent hover:border-muted"
                        } inline-flex items-center justify-center text-xs`}
                      >
                        ✓
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(img.id, "isPublished", !img.isPublished)}
                        className={`px-2 py-0.5 rounded text-xs ${
                          img.isPublished
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {img.isPublished ? "已上架" : "已下架"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setEditingImage(img);
                          setModalOpen(true);
                        }}
                        className="text-accent hover:text-accent/80 text-xs mr-3"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(img.id)}
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

      <GalleryModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingImage(null);
        }}
        onSubmit={editingImage ? handleEdit : handleAdd}
        initial={
          editingImage
            ? {
                imageUrl: editingImage.imageUrl,
                prompt: editingImage.prompt || "",
                modelTag: editingImage.modelTag,
                styleTag: editingImage.styleTag,
              }
            : undefined
        }
        title={editingImage ? "编辑图片" : "添加图片"}
      />
    </div>
  );
}
