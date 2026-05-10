"use client";

import { useCallback, useRef, useState } from "react";

interface ReferenceImage {
  id: string;
  preview: string;
  file?: File;
  url?: string;
}

interface ReferenceImagesProps {
  images: ReferenceImage[];
  onChange: (images: ReferenceImage[]) => void;
  disabled?: boolean;
}

export function ReferenceImages({
  images,
  onChange,
  disabled,
}: ReferenceImagesProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const remaining = 12 - images.length;
      if (remaining <= 0) return;

      const newImages: ReferenceImage[] = [];
      const fileArray = Array.from(files).slice(0, remaining);

      for (const file of fileArray) {
        if (!file.type.startsWith("image/")) continue;
        newImages.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          preview: URL.createObjectURL(file),
        });
      }

      onChange([...images, ...newImages]);
    },
    [images, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles, disabled]
  );

  const handleReorder = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (fromIdx === toIdx) return;
      const updated = [...images];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      onChange(updated);
    },
    [images, onChange]
  );

  const handleRemove = useCallback(
    (id: string) => {
      const img = images.find((i) => i.id === id);
      if (img?.file) URL.revokeObjectURL(img.preview);
      onChange(images.filter((i) => i.id !== id));
    },
    [images, onChange]
  );

  return (
    <div className="mb-3.5">
      <div className="flex items-center justify-between mb-[9px]">
        <span className="text-[13px] font-medium tracking-[.02em]">参考图</span>
        <span className="font-mono text-[11px] text-muted tracking-[.03em]">
          最多 12 张，拖拽排序
        </span>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border border-dashed rounded-[var(--r)] p-3 min-h-[80px] transition-all ${
          dragOver
            ? "border-accent bg-accent-d"
            : "border-border"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {images.length > 0 ? (
          <div className="grid grid-cols-6 gap-2">
            {images.map((img, idx) => (
              <div
                key={img.id}
                draggable={!disabled}
                onDragStart={() => setDragIndex(idx)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dragIndex !== null && dragIndex !== idx) {
                    handleReorder(dragIndex, idx);
                    setDragIndex(idx);
                  }
                }}
                onDragEnd={() => setDragIndex(null)}
                className={`relative aspect-square rounded-[4px] overflow-hidden border border-border group cursor-grab hover:border-accent transition-all duration-200 ${
                  dragIndex === idx ? "opacity-40 scale-[.92]" : ""
                }`}
              >
                <img
                  src={img.preview}
                  alt={`参考图 ${idx + 1}`}
                  className="w-full h-full object-cover pointer-events-none"
                />
                <button
                  onClick={() => handleRemove(img.id)}
                  className="absolute top-[3px] right-[3px] w-[18px] h-[18px] flex items-center justify-center rounded-full text-[11px] text-fg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "oklch(10% .01 55 / .8)" }}
                >
                  ✕
                </button>
                <span
                  className="absolute bottom-[3px] left-[3px] px-[5px] py-px rounded-[3px] font-mono text-[9px] text-fg tracking-[.04em]"
                  style={{ background: "oklch(10% .01 55 / .75)" }}
                >
                  {idx + 1}
                </span>
              </div>
            ))}
            {images.length < 12 && (
              <label
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square border border-dashed border-border rounded flex items-center justify-center text-xl text-muted cursor-pointer hover:border-accent hover:text-accent transition-colors"
              >
                +
              </label>
            )}
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center min-h-[56px] cursor-pointer"
            onClick={() => !disabled && fileInputRef.current?.click()}
          >
            <div className="text-[28px] opacity-30 mb-2">⊕</div>
            <div className="text-[13px] text-muted">
              拖拽图片到此处，或{" "}
              <span className="text-accent underline">点击上传</span>
            </div>
            <div className="font-mono text-[10px] text-muted mt-1.5 tracking-[.04em]">
              支持 JPG / PNG / WEBP · 最多 12 张
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export type { ReferenceImage };
