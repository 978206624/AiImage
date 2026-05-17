"use client";

import { useEffect, useRef, useState } from "react";

interface ModelItem {
  id: string;
  name: string;
  provider: string;
  creditCost: number;
}

interface ModelSelectorProps {
  selected: string;
  onSelect: (id: string, creditCost: number) => void;
  onModelsLoaded?: (models: ModelItem[]) => void;
}

const FALLBACK_MODELS: ModelItem[] = [
  {
    id: "gpt-image-2",
    name: "GPT Image2",
    provider: "openai",
    creditCost: 0.07,
  },
];

const PROVIDER_DOT: Record<string, string> = {
  openai: "oklch(62% .18 255)",
  google: "oklch(62% .2 145)",
};

export function ModelSelector({ selected, onSelect, onModelsLoaded }: ModelSelectorProps) {
  const [models, setModels] = useState<ModelItem[]>(FALLBACK_MODELS);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success && data.models?.length > 0) {
          setModels(data.models);
          onModelsLoaded?.(data.models);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const exists = models.some((m) => m.id === selected);
    if (!exists && models.length > 0) {
      onSelect(models[0].id, models[0].creditCost);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, models]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = models.find((m) => m.id === selected) ?? models[0];
  const currentDot = current
    ? PROVIDER_DOT[current.provider] || "var(--muted)"
    : "var(--muted)";

  return (
    <div>
      <div className="font-mono text-[10px] tracking-[.1em] uppercase text-muted mb-2.5">
        模型
      </div>
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-2 h-[42px] px-[12px] border border-border rounded-[var(--r)] hover:border-accent transition-colors text-left"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className="w-[7px] h-[7px] rounded-full shrink-0"
              style={{ background: currentDot }}
            />
            <span className="text-sm font-medium text-fg truncate">
              {current?.name ?? "选择模型"}
            </span>
            {current && (
              <span className="text-[10px] text-muted shrink-0">
                {current.creditCost} 积分/张
              </span>
            )}
          </span>
          <svg
            width="10"
            height="10"
            viewBox="0 0 12 12"
            className={`shrink-0 text-muted transition-transform ${
              open ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M2 4l4 4 4-4" />
          </svg>
        </button>

        {open && (
          <div
            role="listbox"
            className="absolute left-0 right-0 top-full mt-1.5 z-20 border border-border bg-bg rounded-[var(--r)] shadow-lg py-1 max-h-[280px] overflow-y-auto"
          >
            {models.map((model) => {
              const dot = PROVIDER_DOT[model.provider] || "var(--muted)";
              const isSelected = selected === model.id;
              return (
                <button
                  key={model.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelect(model.id, model.creditCost);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-[12px] py-2 flex items-center gap-2 hover:bg-surface transition-colors ${
                    isSelected ? "bg-accent-d" : ""
                  }`}
                >
                  <span
                    className="w-[7px] h-[7px] rounded-full shrink-0"
                    style={{ background: dot }}
                  />
                  <span
                    className={`text-sm flex-1 min-w-0 truncate ${
                      isSelected ? "text-accent font-medium" : "text-fg"
                    }`}
                  >
                    {model.name}
                  </span>
                  <span className="text-[10px] text-muted shrink-0">
                    {model.creditCost} 积分/张
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
