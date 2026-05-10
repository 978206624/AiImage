"use client";

import { useEffect, useState } from "react";
import { ASPECT_RATIOS } from "@/lib/constants";
import type { AspectRatio, Quality } from "@/lib/size-map";

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

const QUALITY_LABELS: Record<Quality, string> = {
  low: "1K",
  medium: "2K",
  high: "4K",
};

const STYLE_GRADIENTS = [
  // g-pur
  "radial-gradient(ellipse at 38% 42%, oklch(52% .2 320 / .32) 0%, transparent 58%), radial-gradient(ellipse at 72% 68%, oklch(44% .16 262 / .22) 0%, transparent 48%), linear-gradient(140deg, oklch(17% .09 290) 0%, oklch(27% .13 310) 45%, oklch(19% .06 270) 100%)",
  // g-grn
  "radial-gradient(ellipse at 44% 54%, oklch(60% .2 148 / .28) 0%, transparent 50%), linear-gradient(140deg, oklch(17% .09 143) 0%, oklch(25% .12 158) 50%, oklch(14% .05 128) 100%)",
  // g-teal
  "radial-gradient(ellipse at 42% 50%, oklch(58% .2 183 / .28) 0%, transparent 50%), linear-gradient(140deg, oklch(17% .08 188) 0%, oklch(27% .12 174) 50%, oklch(14% .05 198) 100%)",
  // g-blue
  "radial-gradient(ellipse at 50% 38%, oklch(54% .22 252 / .28) 0%, transparent 55%), linear-gradient(140deg, oklch(14% .07 245) 0%, oklch(24% .11 260) 50%, oklch(17% .07 225) 100%)",
  // g-ind
  "radial-gradient(ellipse at 50% 40%, oklch(52% .26 278 / .34) 0%, transparent 56%), linear-gradient(140deg, oklch(15% .11 278) 0%, oklch(23% .16 268) 50%, oklch(13% .08 288) 100%)",
  // g-amb
  "radial-gradient(ellipse at 58% 42%, oklch(72% .2 68 / .28) 0%, transparent 55%), linear-gradient(140deg, oklch(21% .09 58) 0%, oklch(31% .13 48) 50%, oklch(17% .05 70) 100%)",
  // g-rose
  "radial-gradient(ellipse at 54% 44%, oklch(62% .22 8 / .28) 0%, transparent 55%), linear-gradient(140deg, oklch(19% .1 15) 0%, oklch(29% .14 348) 50%, oklch(17% .07 28) 100%)",
  // g-warm
  "radial-gradient(ellipse at 40% 58%, oklch(64% .18 44 / .24) 0%, transparent 50%), linear-gradient(140deg, oklch(19% .07 42) 0%, oklch(29% .1 55) 50%, oklch(17% .04 33) 100%)",
];

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

  const qualityIndex = quality === "low" ? 1 : quality === "medium" ? 2 : 3;

  return (
    <div>
      <div className="font-mono text-[10px] tracking-[.1em] uppercase text-muted mb-4">
        生图参数
      </div>

      {/* Aspect Ratio */}
      <div className="mb-[22px]">
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
      <div className="mb-[22px]">
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
      <div className="mb-[22px]">
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

      {/* Style Presets */}
      <div>
        <div className="font-mono text-[10px] tracking-[.1em] uppercase text-muted mb-2.5">
          风格预设
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => onPresetChange(null)}
            className={`flex items-center gap-2.5 p-2 px-2.5 border rounded transition-all ${
              selectedPresetId === null
                ? "border-accent bg-accent-d"
                : "border-border hover:border-accent"
            }`}
          >
            <span
              className="w-7 h-7 rounded-[3px] shrink-0"
              style={{ background: STYLE_GRADIENTS[0] }}
            />
            <span className="text-xs">无（原始风格）</span>
          </button>
          {presets.map((preset, i) => (
            <button
              key={preset.id}
              onClick={() =>
                onPresetChange(selectedPresetId === preset.id ? null : preset.id)
              }
              className={`flex items-center gap-2.5 p-2 px-2.5 border rounded transition-all ${
                selectedPresetId === preset.id
                  ? "border-accent bg-accent-d"
                  : "border-border hover:border-accent"
              }`}
            >
              <span
                className="w-7 h-7 rounded-[3px] shrink-0"
                style={{
                  background:
                    STYLE_GRADIENTS[(i + 1) % STYLE_GRADIENTS.length],
                }}
              />
              <span className="text-xs">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
