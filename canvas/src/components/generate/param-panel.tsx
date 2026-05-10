"use client";

import { ASPECT_RATIOS, QUALITY_OPTIONS, GENERATION_COUNTS } from "@/lib/constants";
import type { AspectRatio, Quality } from "@/lib/size-map";
import { useEffect, useState } from "react";

interface StylePreset {
  id: number;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  promptPrefix: string;
}

interface ParamPanelProps {
  aspectRatio: AspectRatio;
  quality: Quality;
  count: number;
  selectedPresetId: number | null;
  onAspectRatioChange: (v: AspectRatio) => void;
  onQualityChange: (v: Quality) => void;
  onCountChange: (v: number) => void;
  onPresetChange: (id: number | null) => void;
}

export function ParamPanel({
  aspectRatio,
  quality,
  count,
  selectedPresetId,
  onAspectRatioChange,
  onQualityChange,
  onCountChange,
  onPresetChange,
}: ParamPanelProps) {
  const [presets, setPresets] = useState<StylePreset[]>([]);

  useEffect(() => {
    fetch("/api/presets")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPresets(d.data);
      })
      .catch(() => {});
  }, []);

  const qualityIndex = QUALITY_OPTIONS.findIndex((q) => q.value === quality);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">
          画面比例
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {ASPECT_RATIOS.map((ar) => (
            <button
              key={ar.value}
              onClick={() => onAspectRatioChange(ar.value as AspectRatio)}
              className={`py-2 text-sm rounded-md border transition-all ${
                aspectRatio === ar.value
                  ? "border-accent bg-accent-d text-fg"
                  : "border-border bg-surface text-muted hover:text-fg hover:border-accent/50"
              }`}
            >
              {ar.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">
          生图质量
        </h3>
        <div className="relative">
  <input
            type="range"
            min={0}
            max={2}
            step={1}
            value={qualityIndex}
            onChange={(e) => {
              const idx = parseInt(e.target.value);
              onQualityChange(QUALITY_OPTIONS[idx].value as Quality);
            }}
            className="w-full h-1.5 bg-surface2 rounded-full appearance-none cursor-pointer accent-accent"
          />
          <div className="flex justify-between mt-2">
            {QUALITY_OPTIONS.map((q) => (
              <span
                key={q.value}
                className={`text-xs ${quality === q.value ? "text-accent" : "text-muted"}`}
              >
                {q.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">
          生成数量
        </h3>
        <div className="flex gap-2">
          {GENERATION_COUNTS.map((n) => (
            <button
              key={n}
              onClick={() => onCountChange(n)}
              className={`flex-1 py-2 text-sm rounded-md border transition-all ${
                count === n
                  ? "border-accent bg-accent-d text-fg"
                  : "border-border bg-surface text-muted hover:text-fg hover:border-accent/50"
              }`}
            >
              {n} 张
            </button>
          ))}
        </div>
      </div>

      {presets.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-3">
            风格预设
          </h3>
          <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() =>
                  onPresetChange(selectedPresetId === preset.id ? null : preset.id)
                }
                className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                  selectedPresetId === preset.id
                    ? "border-accent bg-accent-d"
                    : "border-border bg-surface hover:border-accent/50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {preset.coverImageUrl ? (
                    <img
                      src={preset.coverImageUrl}
                      alt={preset.name}
                      className="w-8 h-8 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-surface2 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm text-fg truncate">{preset.name}</p>                {preset.description && (
                      <p className="text-xs text-muted truncate">
                        {preset.description}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
