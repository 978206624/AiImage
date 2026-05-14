"use client";

import { useState, useCallback, useEffect } from "react";
import ImageUploader from "@/components/admin/image-uploader";

interface PresetFormData {
  name: string;
  description: string;
  coverImageUrl: string;
  promptPrefix: string;
  sortOrder: number;
}

interface PresetModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PresetFormData) => Promise<void>;
  initial?: PresetFormData;
  title: string;
}

export default function PresetModal({
  open,
  onClose,
  onSubmit,
  initial,
  title,
}: PresetModalProps) {
  const [form, setForm] = useState<PresetFormData>(
    initial || { name: "", description: "", coverImageUrl: "", promptPrefix: "", sortOrder: 0 }
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!initial) return;
    void Promise.resolve().then(() => {
      setForm(initial);
    });
  }, [initial]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.name.trim() || !form.promptPrefix.trim()) {
        alert("预设名和 prompt 前缀为必填");
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
              dir="presets"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">预设名称</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
              placeholder="如：赛博朋克"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">描述</label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-fg text-sm focus:outline-none focus:border-accent"
              placeholder="简短描述该风格预设..."
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">Prompt 前缀</label>
            <textarea
              value={form.promptPrefix}
              onChange={(e) => setForm((f) => ({ ...f, promptPrefix: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-fg text-sm resize-none focus:outline-none focus:border-accent"
              placeholder="选中该预设时，会拼接到用户提示词前面..."
            />
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
