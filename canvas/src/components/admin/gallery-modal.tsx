"use client";

import { useState, useCallback, useEffect } from "react";
import ImageUploader from "@/components/admin/image-uploader";
import { Select } from "@/components/ui/select";

const MODEL_TAGS = ["GPT-4o Image", "Google Imagen 3"];
const STYLE_TAGS = ["写实", "动漫", "油画", "赛博朋克", "水墨", "极简", "通用"];

interface GalleryFormData {
  imageUrl: string;
  prompt: string;
  modelTag: string;
  styleTag: string;
  title: string;
  categoryId: number | null;
}

interface CategoryOption {
  id: number;
  name: string;
}

interface GalleryModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: GalleryFormData) => Promise<void>;
  initial?: GalleryFormData;
  title: string;
}

const EMPTY_FORM: GalleryFormData = {
  imageUrl: "",
  prompt: "",
  modelTag: MODEL_TAGS[0],
  styleTag: STYLE_TAGS[0],
  title: "",
  categoryId: null,
};

export default function GalleryModal({
  open,
  onClose,
  onSubmit,
  initial,
  title,
}: GalleryModalProps) {
  const [form, setForm] = useState<GalleryFormData>(initial || EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setCategories(res.data);
      })
      .catch(() => setCategories([]));
  }, [open]);

  useEffect(() => {
    if (open) setForm(initial || EMPTY_FORM);
  }, [open, initial]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.imageUrl) {
        alert("请上传图片");
        return;
      }
      setSubmitting(true);
      try {
        await onSubmit(form);
        onClose();
      } finally {
        setSubmitting(false);
      }
    },
    [form, onSubmit, onClose]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-xl w-full max-w-lg p-6 shadow-xl">
        <h2 className="text-fg font-medium text-lg mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1.5">图片</label>
            <ImageUploader
              value={form.imageUrl}
              onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">
              标题（可选，原模板名）
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={100}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
              placeholder="比如：晨光温室人像"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">Prompt</label>
            <textarea
              value={form.prompt}
              onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-fg text-sm resize-none focus:outline-none focus:border-accent"
              placeholder="描述这张图片的提示词..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-muted mb-1.5">模型标签</label>
              <Select
                value={form.modelTag}
                onChange={(v) => setForm((f) => ({ ...f, modelTag: v }))}
                options={MODEL_TAGS.map((tag) => ({ value: tag, label: tag }))}
                ariaLabel="模型标签"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">风格标签</label>
              <Select
                value={form.styleTag}
                onChange={(v) => setForm((f) => ({ ...f, styleTag: v }))}
                options={STYLE_TAGS.map((tag) => ({ value: tag, label: tag }))}
                ariaLabel="风格标签"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">分类</label>
              <Select
                value={form.categoryId === null ? "" : String(form.categoryId)}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    categoryId: v === "" ? null : parseInt(v),
                  }))
                }
                options={[
                  { value: "", label: "未分类" },
                  ...categories.map((c) => ({
                    value: String(c.id),
                    label: c.name,
                  })),
                ]}
                ariaLabel="分类"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted hover:text-fg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50"
            >
              {submitting ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
