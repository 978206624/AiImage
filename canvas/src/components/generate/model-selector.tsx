"use client";

import { useEffect, useState } from "react";

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

const PROVIDER_TAG_BG: Record<string, string> = {
  openai: "oklch(62% .18 255 / .14)",
  google: "oklch(62% .2 145 / .14)",
};

export function ModelSelector({ selected, onSelect, onModelsLoaded }: ModelSelectorProps) {
  const [models, setModels] = useState<ModelItem[]>(FALLBACK_MODELS);
  const [loaded, setLoaded] = useState(false);

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
    return () => { cancelled = true; };
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

  return (
    <div>
      <div className="font-mono text-[10px] tracking-[.1em] uppercase text-muted mb-4">
        选择模型
      </div>
      {models.map((model) => {
        const dot = PROVIDER_DOT[model.provider] || "var(--muted)";
        const tagBg = PROVIDER_TAG_BG[model.provider];
        const isSelected = selected === model.id;
        return (
          <button
            key={model.id}
            onClick={() => onSelect(model.id, model.creditCost)}
            className={`w-full text-left p-[14px] rounded-[var(--r)] border mb-2.5 transition-all ${
              isSelected
                ? "border-accent bg-accent-d"
                : "border-border hover:border-accent"
            }`}
          >
            <div className="flex items-center gap-2 mb-[5px]">
              <span
                className="w-[7px] h-[7px] rounded-full shrink-0"
                style={{ background: dot }}
              />
              <span className="text-sm font-medium text-fg">{model.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-block px-2 py-0.5 rounded-[3px] font-mono text-[10px] tracking-[.04em]"
                style={{ background: tagBg, color: dot }}
              >
                {model.provider}
              </span>
              <span className="text-[10px] text-muted">
                {model.creditCost} 积分/张
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
