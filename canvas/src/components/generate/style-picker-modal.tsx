"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export interface StylePreset {
  id: number;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  promptPrefix: string;
}

interface StylePickerModalProps {
  open: boolean;
  selectedId: number | null;
  presets: StylePreset[];
  onApply: (id: number | null) => void;
  onClose: () => void;
}

export function StylePickerModal({
  open,
  selectedId,
  presets,
  onApply,
  onClose,
}: StylePickerModalProps) {
  const [localSelected, setLocalSelected] = useState<number | null>(selectedId);

  useEffect(() => {
    if (!open) return;
    void Promise.resolve().then(() => {
      setLocalSelected(selectedId);
    });
  }, [open, selectedId]);

  if (!open) return null;

  const toggle = (id: number) => {
    setLocalSelected((prev) => (prev === id ? null : id));
  };

  const handleApply = () => {
    onApply(localSelected);
  };

  const handleClear = () => setLocalSelected(null);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[640px] max-h-[80vh] bg-bg border border-border rounded-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-base font-medium">选择风格预设</h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-fg transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {presets.map((preset) => {
              const isSelected = localSelected === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => toggle(preset.id)}
                  className={`relative flex flex-col rounded-lg border p-3 text-left transition-all ${
                    isSelected
                      ? "border-accent bg-accent-d ring-1 ring-accent/40"
                      : "border-border hover:border-fg/30"
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent text-bg flex items-center justify-center text-xs font-bold">
                      ✓
                    </span>
                  )}
                  {preset.coverImageUrl ? (
                    <Image
                      src={preset.coverImageUrl}
                      alt={preset.name}
                      className="w-full aspect-[4/3] object-cover rounded mb-2"
                      width={200}
                      height={150}
                      unoptimized
                    />
                  ) : (
                    <div className="w-full aspect-[4/3] rounded mb-2 bg-surface2" />
                  )}
                  <span className="text-xs font-medium text-fg line-clamp-1">
                    {preset.name}
                  </span>
                  {preset.description && (
                    <span className="text-[11px] text-muted line-clamp-2 mt-0.5">
                      {preset.description}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted">
            {localSelected != null ? "已选 1 个" : "未选择"}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-xs text-muted border border-border rounded hover:text-fg hover:border-fg/30 transition-colors"
            >
              清空
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-1.5 text-xs font-medium bg-accent text-bg rounded hover:opacity-90 transition-opacity"
            >
              应用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
