"use client";

import { ASPECT_RATIOS } from "@/lib/constants";
import type { AspectRatio, Quality } from "@/lib/size-map";

interface ParamPanelProps {
  aspectRatio: AspectRatio;
  quality: Quality;
  count: number;
  onAspectRatioChange: (v: AspectRatio) => void;
  onQualityChange: (v: Quality) => void;
  onCountChange: (v: number) => void;
}

const QUALITY_LABELS: Record<Quality, string> = {
  low: "1K",
  medium: "2K",
  high: "4K",
};

export function ParamPanel({
  aspectRatio,
  quality,
  count,
  onAspectRatioChange,
  onQualityChange,
  onCountChange,
}: ParamPanelProps) {
  const qualityIndex = quality === "low" ? 1 : quality === "medium" ? 2 : 3;

  return (
    <>
      {/* Aspect Ratio */}
      <div>
        <div className="font-mono text-[10px] tracking-[.1em] uppercase text-muted mb-2.5">
          画面比例
        </div>
        <div className="grid grid-cols-3 gap-[5px]">
          {ASPECT_RATIOS.map((r) => (
            <button
              key={r.value}
              onClick={() => onAspectRatioChange(r.value)}
              className={`flex flex-col items-center gap-1 py-[7px] px-1 border rounded text-[10px] transition-all ${
                aspectRatio === r.value
                  ? "border-accent bg-accent-d text-accent"
                  : "border-border text-muted hover:border-accent hover:text-accent"
              }`}
            >
              <span
                className={`rounded-[1px] ${
                  aspectRatio === r.value ? "opacity-100" : "opacity-45"
                }`}
                style={{
                  width: r.iconW,
                  height: r.iconH,
                  background:
                    aspectRatio === r.value ? "var(--accent)" : "var(--muted)",
                }}
              />
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quality */}
      <div>
        <div className="font-mono text-[10px] tracking-[.1em] uppercase text-muted mb-2.5">
          生图质量
        </div>
        <input
          type="range"
          min={1}
          max={3}
          step={1}
          value={qualityIndex}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            const q: Quality = v === 1 ? "low" : v === 2 ? "medium" : "high";
            onQualityChange(q);
          }}
          className="w-full accent-accent mb-[7px]"
        />
        <div className="flex justify-between text-[11px] text-muted">
          <span>1K</span>
          <span className="text-accent">{QUALITY_LABELS[quality]}</span>
          <span>4K</span>
        </div>
      </div>

      {/* Count */}
      <div>
        <div className="font-mono text-[10px] tracking-[.1em] uppercase text-muted mb-2.5">
          生成数量
        </div>
        <div className="flex gap-[5px]">
          {[1, 2, 4].map((n) => (
            <button
              key={n}
              onClick={() => onCountChange(n)}
              className={`flex-1 h-[34px] border rounded text-sm transition-all ${
                count === n
                  ? "border-accent bg-accent-d text-accent"
                  : "border-border text-muted hover:border-accent hover:text-accent"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
