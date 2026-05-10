"use client";

import { useState, useCallback, useEffect } from "react";
import ImageUploader from "@/components/admin/image-uploader";

interface Category {
  id: number;
  name: string;
}

interface TemplateFormData {
  name: string;
  prompt: string;
  categoryId: number;
  coverImageUrl: string;
  sortOrder: number;
}

interface TemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TemplateFormData) => Promise<void>;
  initial?: TemplateFormData;
  title: string;
}

export default function TemplateModal({
  open,
  onClose,
  onSubmit,
  initial,
  title,
}: TemplateModalProps) {
  const [form, setForm] = useState<TemplateFormData>(
    initial || { name: "", prompt: "", categoryId: 0, coverImageUrl: "", sortOrder: 0 }
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/admin/categories")
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            setCategories(json.data);
            if (!form.categoryId && json.data.length > 0) {
              setForm((f) => ({ ...f, categoryId: json.data[0].id }));
            }
          }
        });
    }
  }, [open]);

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.name.trim() || !form.prompt.trim() || !form.categoryId) {
        alert("模板名、提示词、分类为必填");
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
      <div className="relative bg-surface border border-border rounded-xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-fg font-medium text-lg mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1.5">封面图</label>
            <ImageUploader
              value={form.coverImageUrl}
              onChange={(url) => setForm((f) => ({ ...f, coverImageUrl: url }))}
              dir="templates"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">模板名称</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
              placeholder="如：吉卜力风格头像"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">提示词</label>
            <textarea
              value={form.prompt}
              onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-fg text-sm resize-none focus:outline-none focus:border-accent"
              placeholder="完整的提示词文本..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted mb-1.5">分类</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
              >
                {categories.length === 0 && <option value={0}>无分类</option>}
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">排序</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
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
