"use client";

import Image from "next/image";

interface StyleChip {
  id: number;
  name: string;
  coverImageUrl: string | null;
}

interface PromptInputProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  stylePreset?: StyleChip | null;
  onStyleClick?: () => void;
  onRemoveStyle?: () => void;
}

export function PromptInput({
  value,
  onChange,
  disabled,
  stylePreset,
  onStyleClick,
  onRemoveStyle,
}: PromptInputProps) {
  const hasChip = !!stylePreset;

  return (
    <div className="mb-3.5">
      <div className="flex items-center justify-between mb-[9px]">
        <span className="text-[13px] font-medium tracking-[.02em]">
          生图提示词
        </span>
        <span className="font-mono text-[11px] text-muted tracking-[.03em]">
          描述你想要的画面
        </span>
      </div>
      <div
        className={`relative bg-surface border rounded-[var(--r)] transition-colors ${
          disabled ? "opacity-50" : ""
        } border-border focus-within:border-accent`}
      >
        {hasChip && (
          <div className="px-3 pt-3">
            <span className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-md border border-border bg-bg text-[12px]">
              {stylePreset.coverImageUrl ? (
                <Image
                  src={stylePreset.coverImageUrl}
                  alt=""
                  width={20}
                  height={20}
                  className="w-5 h-5 rounded-sm object-cover"
                  unoptimized
                />
              ) : (
                <span className="w-5 h-5 rounded-sm bg-surface2" />
              )}
              <span className="text-fg">{stylePreset.name}</span>
              <button
                type="button"
                onClick={onRemoveStyle}
                disabled={disabled}
                className="ml-1 w-4 h-4 inline-flex items-center justify-center rounded-sm text-muted hover:text-fg hover:bg-surface2 transition-colors"
                aria-label="移除风格"
              >
                ✕
              </button>
            </span>
          </div>
        )}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="描述你想生成的图像，例如：清晨的江南水乡，薄雾弥漫，白墙黛瓦，一叶小舟穿桥而过，水墨画风格…"
          rows={9}
          className={`w-full px-4 ${
            hasChip ? "pt-2" : "pt-3.5"
          } pb-3.5 bg-transparent text-fg font-mono text-[13px] leading-[1.7] placeholder:text-muted resize-none overflow-y-auto focus:outline-none disabled:opacity-50`}
        />
        {onStyleClick && (
          <button
            type="button"
            onClick={onStyleClick}
            className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-md border border-border bg-bg/80 backdrop-blur-sm text-muted hover:text-accent hover:border-accent transition-colors"
          >
            选择风格
          </button>
        )}
      </div>
    </div>
  );
}
