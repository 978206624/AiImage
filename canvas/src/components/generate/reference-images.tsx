"use client";

import { useCallback, useRef, useState } from "react";

interface ReferenceImage {
  id: string;
  file: File;
  preview: string;
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
      if (img) URL.revokeObjectURL(img.preview);
      onChange(images.filter((i) => i.id !== id));
    },
    [images, onChange]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted">
          参考图 ({images.length}/12)
        </span>
        {images.length > 0 && (
          <button
            onClick={() => {
              images.forEach((i) => URL.revokeObjectURL(i.preview));
              onChange([]);
            }}
            className="text-xs text-muted hover:text-fg transition-colors"
          >
            清空
          </button>
        )}
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-6 gap-2 mb-3">
          {images.map((img, idx) => (
            <div
              key={img.id}
              draggable={!disabled}
              onDragStart={() => setDragIndex(idx)}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragIndex !== null && dragIndex !== idx) {
                  handleReorder(dragIndex, idx);
                  setDragIndex(idx);
                }
              }}
              onDragEnd={() => setDragIndex(null)}
              className="relative aspect-square rounded-md overflow-hidden border border-border group cursor-move"
            >
              <img
                src={img.preview}
                alt={`参考图 ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-1 left-1 text-[10px] bg-black/60 text-white px-1 rounded">
                {idx + 1}
              </span>
              <button
                onClick={() => handleRemove(img.id)}
                className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length < 12 && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
            dragOver
              ? "border-accent bg-accent-d"
              : "border-border hover:border-accent/50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <p className="text-sm text-muted">
            拖拽图片到此处，或点击上传
          </p>
          <p className="text-xs text-muted/60 mt-1">
            支持 JPG、PNG、WebP，最多 12 张
          </p>
        </div>
      )}

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
