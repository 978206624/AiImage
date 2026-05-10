"use client";

import { MODELS } from "@/lib/constants";

interface ModelSelectorProps {
  selected: string;
  onSelect: (id: string) => void;
}

const MODEL_DOT: Record<string, string> = {
  "gpt-4o-image": "oklch(62% .18 255)",
  "google-imagen-3": "oklch(62% .2 145)",
  "midjourney-v6": "oklch(62% .16 30)",
};

const MODEL_TAG_BG: Record<string, string> = {
  "gpt-4o-image": "oklch(62% .18 255 / .14)",
  "google-imagen-3": "oklch(62% .2 145 / .14)",
  "midjourney-v6": "oklch(62% .16 30 / .14)",
};

const MODEL_TAGS: Record<string, string> = {
  "gpt-4o-image": "原生多模态",
  "google-imagen-3": "Imagen 3",
  "midjourney-v6": "v6",
};

export function ModelSelector({ selected, onSelect }: ModelSelectorProps) {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[.1em] uppercase text-muted mb-4">
        选择模型
      </div>
      {MODELS.map((model) => {
        const dot = MODEL_DOT[model.id] || "var(--muted)";
        const tagBg = MODEL_TAG_BG[model.id];
        const tagColor = MODEL_DOT[model.id];
        const tag = MODEL_TAGS[model.id];
        const isSelected = selected === model.id;
        return (
          <button
            key={model.id}
            onClick={() => model.available && onSelect(model.id)}
            disabled={!model.available}
            className={`w-full text-left p-[14px] rounded-[var(--r)] border mb-2.5 transition-all ${
              isSelected
                ? "border-accent bg-accent-d"
                : model.available
                  ? "border-border hover:border-accent"
                  : "border-border/50 opacity-60 cursor-not-allowed"
            }`}
          >
            <div className="flex items-center gap-2 mb-[5px]">
              <span
                className="w-[7px] h-[7px] rounded-full shrink-0"
                style={{ background: dot }}
              />
              <span className="text-sm font-medium text-fg">{model.name}</span>
            </div>
            <p className="text-[11px] text-muted leading-[1.5]">
              {model.description}
            </p>
            {tag && (
              <span
                className="inline-block mt-2 px-2 py-0.5 rounded-[3px] font-mono text-[10px] tracking-[.04em]"
                style={{
                  background: tagBg,
                  color: tagColor,
                }}
              >
                {tag}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
