"use client";

interface PromptInputProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  styleCount?: number;
  onStyleClick?: () => void;
}

export function PromptInput({
  value,
  onChange,
  disabled,
  styleCount = 0,
  onStyleClick,
}: PromptInputProps) {
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
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="描述你想生成的图像，例如：清晨的江南水乡，薄雾弥漫，白墙黛瓦，一叶小舟穿桥而过，水墨画风格…"
          rows={3}
          className="w-full px-4 py-3.5 bg-surface border border-border rounded-[var(--r)] text-fg font-mono text-[13px] leading-[1.7] placeholder:text-muted resize-y focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
        />
        {onStyleClick && (
          <button
            type="button"
            onClick={onStyleClick}
            className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-md border border-border bg-bg/80 backdrop-blur-sm text-muted hover:text-accent hover:border-accent transition-colors"
          >
            选择风格
            {styleCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-accent text-bg text-[10px] font-bold">
                {styleCount}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
