"use client";

import Image from "next/image";
import type { HistoryItem } from "@/components/generate/recent-history";

const QUALITY_LABEL: Record<string, string> = {
  low: "1K",
  medium: "2K",
  high: "4K",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

interface HistoryCardProps {
  item: HistoryItem;
  deleting?: boolean;
  onView: () => void;
  onDownload: () => void;
  onReuse: () => void;
  onDelete: () => void;
}

export function HistoryCard({
  item,
  deleting,
  onView,
  onDownload,
  onReuse,
  onDelete,
}: HistoryCardProps) {
  return (
    <div className="border border-border rounded-[var(--r)] overflow-hidden bg-surface">
      <button
        onClick={onView}
        className="block w-full aspect-square relative group bg-surface2"
      >
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.promptSummary || ""}
            fill
            sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, (max-width: 1280px) 14vw, 12vw"
            className="object-contain"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted text-[10px]">
            无图
          </div>
        )}
        {!item.isPersisted && (
          <span className="absolute top-1 right-1 px-1 py-0.5 bg-yellow-900/80 text-yellow-200 border border-yellow-700/50 text-[9px] rounded">
            过期
          </span>
        )}
      </button>
      <div className="p-2">
        <p
          className="text-[11px] text-fg/90 line-clamp-1 leading-tight mb-1.5"
          title={item.prompt || item.promptSummary || ""}
        >
          {item.promptSummary || "无提示词"}
        </p>
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span
            className="font-mono text-[9px] text-muted px-1 py-0.5 bg-bg rounded truncate max-w-[110px]"
            title={item.modelTag}
          >
            {item.modelTag}
          </span>
          {item.aspectRatio && (
            <span className="font-mono text-[9px] text-muted px-1 py-0.5 bg-bg rounded">
              {item.aspectRatio}
            </span>
          )}
          {item.quality && QUALITY_LABEL[item.quality] && (
            <span className="font-mono text-[9px] text-muted px-1 py-0.5 bg-bg rounded">
              {QUALITY_LABEL[item.quality]}
            </span>
          )}
          <span className="font-mono text-[9px] text-muted">
            {formatDate(item.createdAt)}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onView}
            title="查看"
            className="flex-1 h-6 flex items-center justify-center text-muted border border-border rounded hover:text-fg hover:border-accent transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button
            onClick={onDownload}
            title="下载"
            disabled={!item.imageUrl}
            className="flex-1 h-6 flex items-center justify-center text-muted border border-border rounded hover:text-fg hover:border-accent transition-colors disabled:opacity-40"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button
            onClick={onReuse}
            title="复用参数"
            className="flex-1 h-6 flex items-center justify-center text-accent border border-accent-b rounded hover:bg-accent-d transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            title="删除"
            className="flex-1 h-6 flex items-center justify-center text-muted border border-border rounded hover:text-red-400 hover:border-red-400 transition-colors disabled:opacity-40"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
