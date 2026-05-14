"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type TabType = "topup" | "consume";

interface TopupItem {
  id: number;
  codeMasked: string;
  addedCredits: number;
  redeemedAt: string | null;
}

interface ConsumeItem {
  id: number;
  creditsUsed: number;
  promptSummary: string | null;
  imageUrl: string | null;
  createdAt: string;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

interface ListState<T> {
  items: T[];
  page: number;
  hasMore: boolean;
  loading: boolean;
}

const PAGE_SIZE = 20;

export function TransactionList({ refreshKey }: { refreshKey?: number }) {
  const [tab, setTab] = useState<TabType>("topup");
  const [topup, setTopup] = useState<ListState<TopupItem>>({
    items: [],
    page: 0,
    hasMore: true,
    loading: false,
  });
  const [consume, setConsume] = useState<ListState<ConsumeItem>>({
    items: [],
    page: 0,
    hasMore: true,
    loading: false,
  });

  const loadPage = useCallback(
    async (type: TabType, page: number) => {
      const url = `/api/account/transactions?type=${type}&page=${page}&pageSize=${PAGE_SIZE}`;
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!json.success) return null;
      return json.data as {
        items: TopupItem[] | ConsumeItem[];
        hasMore: boolean;
      };
    },
    []
  );

  const loadInitial = useCallback(
    async (type: TabType) => {
      if (type === "topup") {
        setTopup((s) => ({ ...s, loading: true }));
        const data = await loadPage("topup", 1);
        if (data) {
          setTopup({
            items: data.items as TopupItem[],
            page: 1,
            hasMore: data.hasMore,
            loading: false,
          });
        } else {
          setTopup((s) => ({ ...s, loading: false }));
        }
      } else {
        setConsume((s) => ({ ...s, loading: true }));
        const data = await loadPage("consume", 1);
        if (data) {
          setConsume({
            items: data.items as ConsumeItem[],
            page: 1,
            hasMore: data.hasMore,
            loading: false,
          });
        } else {
          setConsume((s) => ({ ...s, loading: false }));
        }
      }
    },
    [loadPage]
  );

  useEffect(() => {
    void Promise.resolve().then(() => loadInitial(tab));
  }, [tab, refreshKey, loadInitial]);

  async function loadMore() {
    if (tab === "topup" && topup.hasMore && !topup.loading) {
      setTopup((s) => ({ ...s, loading: true }));
      const data = await loadPage("topup", topup.page + 1);
      if (data) {
        setTopup((s) => ({
          items: [...s.items, ...(data.items as TopupItem[])],
          page: s.page + 1,
          hasMore: data.hasMore,
          loading: false,
        }));
      } else {
        setTopup((s) => ({ ...s, loading: false }));
      }
    } else if (tab === "consume" && consume.hasMore && !consume.loading) {
      setConsume((s) => ({ ...s, loading: true }));
      const data = await loadPage("consume", consume.page + 1);
      if (data) {
        setConsume((s) => ({
          items: [...s.items, ...(data.items as ConsumeItem[])],
          page: s.page + 1,
          hasMore: data.hasMore,
          loading: false,
        }));
      } else {
        setConsume((s) => ({ ...s, loading: false }));
      }
    }
  }

  const current = tab === "topup" ? topup : consume;

  return (
    <div>
      <div className="flex gap-1 mb-4 border-b border-border">
        {(
          [
            { key: "topup", label: "充值记录" },
            { key: "consume", label: "消费记录" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "text-fg border-accent"
                : "text-muted border-transparent hover:text-fg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "topup" ? (
        <TopupView items={topup.items} />
      ) : (
        <ConsumeView items={consume.items} />
      )}

      <div className="mt-4 flex justify-center">
        {current.loading && current.items.length === 0 && (
          <span className="text-sm text-muted">加载中...</span>
        )}
        {!current.loading && current.items.length === 0 && (
          <span className="text-sm text-muted">
            {tab === "topup" ? "暂无充值记录" : "暂无消费记录"}
          </span>
        )}
        {current.hasMore && current.items.length > 0 && (
          <button
            onClick={loadMore}
            disabled={current.loading}
            className="px-4 py-1.5 text-xs text-muted border border-border rounded hover:text-fg hover:border-accent transition-colors disabled:opacity-50"
          >
            {current.loading ? "加载中..." : "加载更多"}
          </button>
        )}
      </div>
    </div>
  );
}

function TopupView({ items }: { items: TopupItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="divide-y divide-border">
      {items.map((it) => (
        <div key={it.id} className="py-3 flex items-center gap-4">
          <div className="text-xs text-muted shrink-0 tabular-nums w-[140px]">
            {formatDateTime(it.redeemedAt)}
          </div>
          <div className="flex-1 text-sm text-fg font-mono tracking-wider">
            {it.codeMasked}
          </div>
          <div className="text-sm text-accent font-medium tabular-nums">
            +{it.addedCredits.toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConsumeView({ items }: { items: ConsumeItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="divide-y divide-border">
      {items.map((it) => (
        <div key={it.id} className="py-3 flex items-center gap-4">
          <div className="text-xs text-muted shrink-0 tabular-nums w-[140px]">
            {formatDateTime(it.createdAt)}
          </div>
          {it.imageUrl ? (
            <Image
              src={it.imageUrl}
              alt=""
              width={40}
              height={40}
              className="w-10 h-10 rounded border border-border object-cover shrink-0"
              unoptimized
            />
          ) : (
            <div className="w-10 h-10 rounded border border-border bg-bg shrink-0" />
          )}
          <div className="flex-1 text-sm text-fg truncate">
            {it.promptSummary || "—"}
          </div>
          <div className="text-sm text-muted tabular-nums">
            -{it.creditsUsed.toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}
