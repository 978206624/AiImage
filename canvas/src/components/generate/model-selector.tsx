"use client";

import { MODELS } from "@/lib/constants";

interface ModelSelectorProps {
  selected: string;
  onSelect: (id: string) => void;
}

export function ModelSelector({ selected, onSelect }: ModelSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-muted uppercase tracking-wider px-1 mb-1">
        模型选择
      </h3>
      {MODELS.map((model) => (
        <button
          key={model.id}
          onClick={() => model.available && onSelect(model.id)}
          disabled={!model.available}
          className={`relative w-full text-left p-3 rounded-lg border transition-all ${
            selected === model.id
              ? "border-accent bg-accent-d"
              : model.available
                ? "border-border hover:border-accent/50 bg-surface"
                : "border-border/50 bg-surface/50 opacity-60 cursor-not-allowed"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-fg">{model.name}</span>
            {!model.available && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface2 text-muted">
                即将支持
              </span>
            )}
            {selected === model.id && (
              <span className="w-2 h-2 rounded-full bg-accent" />
            )}
          </div>
          <p className="text-xs text-muted leading-relaxed">
            {model.description}
          </p>
        </button>
      ))}
    </div>
  );
}
