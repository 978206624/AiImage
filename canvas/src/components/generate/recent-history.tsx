"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDeleteUsage } from "@/hooks/use-delete-usage";
import { Lightbox } from "@/components/ui/lightbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { normalizeModelTag } from "@/lib/constants";

const MAX_ITEMS = 10;

const QUALITY_LABEL: Record<string, string> = {
  low: "1K",
  medium: "2K",
  high: "4K",
};

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

  const handleDeleted = useCallback((id: number) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);
  const {
    pendingDelete,
    deleting,
    setPendingDelete,
    confirm: confirmDelete,
    cancel: cancelDelete,
  } = useDeleteUsage<HistoryItem>({ onDeleted: handleDeleted });

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/usage?limit=${MAX_ITEMS}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success) {
        const items = (json.data.items as HistoryItem[]).slice(0, MAX_ITEMS);
        setItems(items);
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
              className="group relative flex gap-2.5 items-start p-1.5 pr-7 rounded hover:bg-surface transition-colors"
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
                <div className="flex items-center gap-1 mt-0.5 font-mono text-[10px] text-muted tracking-[.04em]">
                  <span className="truncate">{item.modelTag}</span>
                  {item.aspectRatio && (
                    <>
                      <span className="opacity-30">·</span>
                      <span>{item.aspectRatio}</span>
                    </>
                  )}
                  {item.quality && QUALITY_LABEL[item.quality] && (
                    <>
                      <span className="opacity-30">·</span>
                      <span>{QUALITY_LABEL[item.quality]}</span>
                    </>
                  )}
                  <span className="opacity-30">·</span>
                  <span className="shrink-0">{timeAgo(item.createdAt)}</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(item)}
                className="absolute top-1.5 right-1 w-5 h-5 flex items-center justify-center rounded text-muted hover:text-red-400 hover:bg-bg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                aria-label="删除"
                title="删除"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {previewItem?.imageUrl && (
        <Lightbox
          src={previewItem.imageUrl}
          prompt={previewItem.prompt || previewItem.promptSummary || undefined}
          model={normalizeModelTag(previewItem.modelTag)}
          onClose={() => setPreviewItem(null)}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="删除创作记录"
        message={
          <>
            确认删除「
            <span className="text-fg">
              {pendingDelete?.promptSummary || "无提示词"}
            </span>
            」？删除后不可恢复。
          </>
        }
        confirmText="删除"
        danger
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={cancelDelete}
      />
    </div>
  );
}
