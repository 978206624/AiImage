"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Lightbox } from "@/components/ui/lightbox";

export interface HistoryItem {
  id: number;
  imageUrl: string | null;
  isPersisted: boolean;
  promptSummary: string | null;
  prompt: string | null;
  modelTag: string;
  aspectRatio: string | null;
  quality: string | null;
  count: number | null;
  stylePresetId: number | null;
  referenceImages: string[];
  createdAt: string;
}

interface RecentHistoryProps {
  onReuse: (item: HistoryItem) => void;
  refreshKey?: number;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "刚刚";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return new Date(iso).toLocaleDateString();
}

export function RecentHistory({ onReuse, refreshKey }: RecentHistoryProps) {
  const { user, loading: userLoading } = useCurrentUser();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewItem, setPreviewItem] = useState<HistoryItem | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/usage?limit=10", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items as HistoryItem[]);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load, refreshKey]);

  if (userLoading) {
    return <div className="text-xs text-muted">加载中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[10px] tracking-[.1em] uppercase text-muted">
          最近创作
        </span>
        {user && (
          <Link
            href="/history"
            className="font-mono text-[10px] tracking-[.05em] text-muted hover:text-accent transition-colors"
          >
            查看全部
          </Link>
        )}
      </div>

      {!user ? (
        <div className="text-xs text-muted leading-relaxed">
          <Link
            href="/login?redirect=/generate"
            className="text-accent hover:underline"
          >
            登录
          </Link>{" "}
          后查看创作历史
        </div>
      ) : loading && items.length === 0 ? (
        <div className="text-xs text-muted">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-xs text-muted leading-relaxed">
          暂无创作记录，开始你的第一次创作
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="group flex gap-2.5 items-start p-1.5 rounded hover:bg-surface transition-colors"
              title={item.prompt || item.promptSummary || ""}
            >
              <button
                type="button"
                onClick={() => item.imageUrl && setPreviewItem(item)}
                disabled={!item.imageUrl}
                className="relative w-11 h-11 shrink-0 rounded border border-border overflow-hidden bg-bg group/thumb hover:border-accent transition-colors"
                aria-label="预览大图"
              >
                {item.imageUrl ? (
                  <>
                    <Image
                      src={item.imageUrl}
                      alt=""
                      width={44}
                      height={44}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="text-white"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </span>
                  </>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => onReuse(item)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="text-[11px] text-fg/90 truncate leading-relaxed">
                  {item.promptSummary || "无提示词"}
                </div>
                <div className="font-mono text-[10px] text-muted mt-0.5 tracking-[.04em]">
                  {timeAgo(item.createdAt)} · 复用参数
                </div>
              </button>
            </div>
          ))}
        </div>
      )}

      {previewItem?.imageUrl && (
        <Lightbox
          src={previewItem.imageUrl}
          prompt={previewItem.prompt || previewItem.promptSummary || undefined}
          model={previewItem.modelTag}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
}
