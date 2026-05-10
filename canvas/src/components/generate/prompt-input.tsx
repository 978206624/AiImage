"use client";

interface PromptInputProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function PromptInput({ value, onChange, disabled }: PromptInputProps) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="描述你想要生成的图像..."
        rows={5}
        className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-fg text-sm placeholder:text-muted/50 resize-none focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
      />
      <div className="flex justify-end mt-1.5">
        <span className="text-xs text-muted">{value.length} 字</span>
      </div>
    </div>
  );
}
