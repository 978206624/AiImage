"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";

import { Lightbox } from "@/components/ui/lightbox";
import { Select } from "@/components/ui/select";
import type { HistoryItem } from "@/components/generate/recent-history";
import { ASPECT_RATIOS, GPT_IMAGE_DISPLAY_NAME } from "@/lib/constants";

const REUSE_KEY = "canvas_reuse_params";
const PAGE_SIZE = 20;

type TimeRange = "today" | "week" | "month" | "all";

const TIME_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "today", label: "今日" },
  { value: "week", label: "本周" },
  { value: "month", label: "本月" },
];

function rangeToStart(range: TimeRange): Date | null {
  const now = new Date();
  if (range === "all") return null;
  if (range === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (range === "month") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d;
  }
  return null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

async function downloadImage(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank");
  }
}

export default function HistoryPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();


  const [items, setItems] = useState<HistoryItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [aspectFilter, setAspectFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login?redirect=/history");
    }
  }, [userLoading, user, router]);

  const loadPage = useCallback(
    async (nextPage: number, replace: boolean) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(nextPage));
        params.set("pageSize", String(PAGE_SIZE));
        const start = rangeToStart(timeRange);
        if (start) params.set("startTime", start.toISOString());
        const res = await fetch(`/api/usage?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (json.success) {
          const data = json.data as {
            items: HistoryItem[];
            hasMore: boolean;
          };
          setItems((prev) =>
            replace ? data.items : [...prev, ...data.items]
          );
          setPage(nextPage);
          setHasMore(data.hasMore);
        }
      } finally {
        setLoading(false);
      }
    },
    [timeRange]
  );

  useEffect(() => {
    if (user) {
      void Promise.resolve().then(() => loadPage(1, true));
    }
  }, [user, loadPage]);

  const filteredItems = useMemo(() => {
    if (aspectFilter === "all") return items;
    return items.filter((it) => it.aspectRatio === aspectFilter);
  }, [items, aspectFilter]);

  function handleReuse(item: HistoryItem) {
    sessionStorage.setItem(REUSE_KEY, JSON.stringify(item));
    router.push("/generate");
  }

  function handleDownload(item: HistoryItem) {
    if (!item.imageUrl) return;
    const ext = item.imageUrl.split(".").pop()?.split("?")[0] || "png";
    downloadImage(item.imageUrl, `canvas-${item.id}.${ext}`);
  }

  if (userLoading || !user) {
    return (
      <div className="pt-[calc(var(--nav)+40px)] px-10 pb-20 text-muted text-sm">
        加载中...
      </div>
    );
  }

  return (
    <>
      <div className="pt-[var(--nav)] pb-20">
        <div
          className="sticky z-[100] bg-bg/95 backdrop-blur-sm border-b border-border px-10 py-4"
          style={{ top: "var(--nav)" }}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1
              className="text-2xl font-normal"
              style={{ fontFamily: "var(--font-d)" }}
            >
              创作历史
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <FilterChips
                value={aspectFilter}
                onChange={setAspectFilter}
                options={[
                  { value: "all", label: "全部比例" },
                  ...ASPECT_RATIOS.map((r) => ({
                    value: r.value,
                    label: r.value,
                  })),
                ]}
              />
              <Select
                value={timeRange}
                onChange={(v) => setTimeRange(v as TimeRange)}
                options={TIME_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
                className="px-3 py-1.5 min-w-[7rem]"
                ariaLabel="时间范围"
              />
            </div>
          </div>
        </div>

        <div className="px-10 pt-6">
          {filteredItems.length === 0 && !loading ? (
            <div className="text-center py-20">
              <p className="text-sm text-muted mb-4">
                {items.length === 0
                  ? "还没有创作记录"
                  : "当前筛选下没有记录"}
              </p>
              <Link
                href="/generate"
                className="inline-block px-5 py-2 bg-accent text-bg text-sm font-medium rounded hover:opacity-90 transition-opacity"
              >
                去生图
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-3">
              {filteredItems.map((item, idx) => (
                <HistoryCard
                  key={item.id}
                  item={item}
                  onView={() => setLightboxIdx(idx)}
                  onDownload={() => handleDownload(item)}
                  onReuse={() => handleReuse(item)}
                />
              ))}
            </div>
          )}

          <div className="mt-8 flex justify-center">
            {loading && (
              <span className="text-sm text-muted">加载中...</span>
            )}
            {!loading && hasMore && items.length > 0 && (
              <button
                onClick={() => void loadPage(page + 1, false)}
                className="px-5 py-1.5 text-sm text-muted border border-border rounded hover:text-fg hover:border-accent transition-colors"
              >
                加载更多
              </button>
            )}
            {!loading && !hasMore && items.length > 0 && (
              <span className="text-xs text-muted">没有更多了</span>
            )}
          </div>
        </div>
      </div>

      {lightboxIdx !== null && filteredItems[lightboxIdx]?.imageUrl && (
        <Lightbox
          src={filteredItems[lightboxIdx].imageUrl!}
          prompt={
            filteredItems[lightboxIdx].prompt ||
            filteredItems[lightboxIdx].promptSummary ||
            undefined
          }
          model={GPT_IMAGE_DISPLAY_NAME}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </>
  );
}

interface FilterChipsProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

function FilterChips({ value, onChange, options }: FilterChipsProps) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 text-xs rounded border transition-colors ${
            value === o.value
              ? "border-accent bg-accent-d text-accent"
              : "border-border text-muted hover:text-fg hover:border-accent"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface HistoryCardProps {
  item: HistoryItem;
  onView: () => void;
  onDownload: () => void;
  onReuse: () => void;
}

function HistoryCard({ item, onView, onDownload, onReuse }: HistoryCardProps) {
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
          {item.aspectRatio && (
            <span className="font-mono text-[9px] text-muted px-1 py-0.5 bg-bg rounded">
              {item.aspectRatio}
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
        </div>
      </div>
    </div>
  );
}
