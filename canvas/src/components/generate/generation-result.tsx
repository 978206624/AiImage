"use client";

import { useState } from "react";
import { Lightbox } from "@/components/ui/lightbox";

interface GenerationResultProps {
  images: string[];
  loading: boolean;
  count: number;
}

function gridStyle(cols: number) {
  if (cols <= 1)
    return { gridTemplateColumns: "1fr", maxWidth: "280px" } as const;
  if (cols <= 2) return { gridTemplateColumns: "1fr 1fr" } as const;
  return { gridTemplateColumns: "repeat(4, 1fr)" } as const;
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
      <div className="mt-4">
        <div className="font-mono text-[10px] tracking-[.1em] uppercase text-muted mb-2.5">
          生成中…
        </div>
        <div className="grid gap-2" style={gridStyle(cols)}>
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="rounded-[var(--r)] bg-surface2 animate-pulse"
              style={{ aspectRatio: "2 / 3" }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (images.length === 0) return null;

  const cols = images.length <= 1 ? 1 : images.length <= 2 ? 2 : 4;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="font-mono text-[10px] tracking-[.1em] uppercase text-muted">
          生成结果
        </div>
        {images.length > 1 && (
          <button
            onClick={handleDownloadAll}
            className="text-[12px] text-accent hover:opacity-80 transition-opacity tracking-[.02em]"
          >
            下载全部 ↓
          </button>
        )}
      </div>
      <div className="grid gap-2" style={gridStyle(cols)}>
        {images.map((url, i) => (
          <div
            key={i}
            className="group relative rounded-[var(--r)] overflow-hidden border border-transparent hover:border-accent transition-colors cursor-pointer"
            style={{ aspectRatio: "2 / 3" }}
            onClick={() => setLightboxIndex(i)}
          >
            <img
              src={url}
              alt={`生成结果 ${i + 1}`}
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-fg"
              style={{ background: "oklch(10% .01 55 / .6)" }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(url, i);
                }}
                className="absolute bottom-2 right-2 w-7 h-7 rounded-[4px] flex items-center justify-center hover:bg-fg/10 transition-colors"
                style={{ background: "oklch(13% .012 60 / .82)" }}
                aria-label="下载"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
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
