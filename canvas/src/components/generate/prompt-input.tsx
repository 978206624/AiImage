"use client";

interface PromptInputProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function PromptInput({ value, onChange, disabled }: PromptInputProps) {
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
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="描述你想生成的图像，例如：清晨的江南水乡，薄雾弥漫，白墙黛瓦，一叶小舟穿桥而过，水墨画风格…"
        rows={3}
        className="w-full px-4 py-3.5 bg-surface border border-border rounded-[var(--r)] text-fg font-mono text-[13px] leading-[1.7] placeholder:text-muted resize-y focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
      />
    </div>
  );
}
