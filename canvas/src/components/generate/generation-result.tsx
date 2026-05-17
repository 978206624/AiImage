"use client";

import { useState } from "react";
import { Lightbox } from "@/components/ui/lightbox";
import type { ImageTaskState } from "@/hooks/use-generation";

interface GenerationResultProps {
  tasks: ImageTaskState[];
  loading: boolean;
  count: number;
}

const TILE_SIZE = 140;

function gridStyle(cols: number) {
  return {
    gridTemplateColumns: `repeat(${cols}, ${TILE_SIZE}px)`,
  } as const;
}

export function GenerationResult({
  tasks,
  loading,
  count,
}: GenerationResultProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const completedImages = tasks
    .filter((t) => t.status === "completed" && t.imageUrl)
    .map((t) => t.imageUrl as string);

  const handleDownload = async (url: string, index: number) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `mira-${Date.now()}-${index + 1}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  };

  const handleDownloadAll = () => {
    completedImages.forEach((url, i) => handleDownload(url, i));
  };

  if (tasks.length === 0 && loading) {
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
              className="rounded-[var(--r)] bg-surface2 animate-pulse aspect-square"
            />
          ))}
        </div>
      </div>
    );
  }

  if (tasks.length === 0) return null;

  const cols = tasks.length <= 1 ? 1 : tasks.length <= 2 ? 2 : 4;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="font-mono text-[10px] tracking-[.1em] uppercase text-muted">
          {loading ? "生成中…" : "生成结果"}
        </div>
        {completedImages.length > 1 && (
          <button
            onClick={handleDownloadAll}
            className="text-[12px] text-accent hover:opacity-80 transition-opacity tracking-[.02em]"
          >
            下载全部 ↓
          </button>
        )}
      </div>
      <div className="grid gap-2" style={gridStyle(cols)}>
        {tasks.map((task, idx) => (
          <TaskTile
            key={task.id}
            task={task}
            onClick={() =>
              task.status === "completed" && task.imageUrl
                ? setLightboxIndex(
                    completedImages.findIndex(
                      (u) => u === task.imageUrl
                    )
                  )
                : undefined
            }
            onDownload={() =>
              task.imageUrl && handleDownload(task.imageUrl, idx)
            }
          />
        ))}
      </div>

      {lightboxIndex !== null && completedImages[lightboxIndex] && (
        <Lightbox
          src={completedImages[lightboxIndex]}
          alt={`生成结果 ${lightboxIndex + 1}`}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

interface TaskTileProps {
  task: ImageTaskState;
  onClick?: () => void;
  onDownload: () => void;
}

function TaskTile({ task, onClick, onDownload }: TaskTileProps) {
  if (task.status === "completed" && task.imageUrl) {
    return (
      <div
        onClick={onClick}
        className="group relative rounded-[var(--r)] overflow-hidden border border-transparent hover:border-accent transition-colors cursor-pointer aspect-square bg-surface2"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={task.imageUrl}
          alt="生成结果"
          className="w-full h-full object-contain"
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
          </svg>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            className="absolute bottom-2 right-2 w-7 h-7 rounded-[4px] flex items-center justify-center bg-bg/82 hover:bg-fg/10 transition-colors"
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
    );
  }

  if (task.status === "failed") {
    return (
      <div
        title={task.failReason || "生成失败"}
        className="rounded-[var(--r)] aspect-square bg-red-900/20 border border-red-700/40 flex flex-col items-center justify-center gap-1 px-2"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="text-red-400"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        <span className="text-[10px] text-red-400 text-center line-clamp-2 leading-tight">
          {task.failReason || "失败"}
        </span>
        <span className="text-[9px] text-muted">已退款</span>
      </div>
    );
  }

  // pending / submitted / processing
  return (
    <div className="relative rounded-[var(--r)] aspect-square bg-surface2 animate-pulse flex items-center justify-center">
      {task.progress > 0 && (
        <span className="font-mono text-[10px] text-muted">
          {task.progress}%
        </span>
      )}
    </div>
  );
}
