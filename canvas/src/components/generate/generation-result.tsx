"use client";

import { useState } from "react";
import { Lightbox } from "@/components/ui/lightbox";

interface GenerationResultProps {
  images: string[];
  loading: boolean;
  count: number;
}

export function GenerationResult({
  images,
  loading,
  count,
}: GenerationResultProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleDownload = async (url: string, index: number) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `canvas-${Date.now()}-${index + 1}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  };

  const handleDownloadAll = () => {
    images.forEach((url, i) => handleDownload(url, i));
  };

  if (loading) {
    const cols = count <= 1 ? 1 : count <= 2 ? 2 : 4;
    return (
      <div className="mt-6">
        <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">
          生成中...
        </h3>
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-surface2 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (images.length === 0) return null;

  const cols = images.length <= 1 ? 1 : images.length <= 2 ? 2 : 4;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-muted uppercase tracking-wider">
          生成结果
        </h3>
        {images.length > 1 && (
          <button
            onClick={handleDownloadAll}
            className="text-xs text-accent hover:text-accent/80 transition-colors"
          >
            下载全部
          </button>
        )}
      </div>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {images.map((url, i) => (
          <div
            key={i}
            className="relative group rounded-lg overflow-hidden border border-border cursor-pointer"
            onClick={() => setLightboxIndex(i)}
          >
            <img
              src={url}
              alt={`生成结果 ${i + 1}`}
              className="w-full aspect-square object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(url, i);
                }}
                className="px-3 py-1.5 text-xs bg-white/90 text-black rounded-md"
              >
                下载
              </button>
            </div>
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          src={images[lightboxIndex]}
          alt={`生成结果 ${lightboxIndex + 1}`}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
