"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

interface TemplateCardProps {
  template: {
    id: number;
    name: string;
    prompt: string;
    coverImageUrl: string | null;
    category: { id: number; name: string } | null;
  };
}

export function TemplateCard({ template }: TemplateCardProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(template.prompt);
    toast("提示词已复制", "success");
  };

  const handleApply = () => {
    router.push(`/generate?prompt=${encodeURIComponent(template.prompt)}`);
  };

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden group">
      {template.coverImageUrl && (
        <div className="aspect-[4/3] overflow-hidden">
          <img
            src={template.coverImageUrl}
            alt={template.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          {template.category && (
            <span className="px-2 py-0.5 text-[10px] rounded bg-accent/15 text-accent">
              {template.category.name}
            </span>
          )}
          <h3 className="text-sm font-medium text-fg truncate">{template.name}</h3>
        </div>
        <p className="text-xs text-muted line-clamp-3 leading-relaxed border-l-2 border-border pl-3 italic">
          {template.prompt}
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 px-3 py-1.5 text-[11px] text-muted border border-border rounded hover:text-fg hover:border-fg/30 transition-colors"
          >
            复制提示词
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-3 py-1.5 text-[11px] text-bg bg-accent rounded hover:opacity-90 transition-opacity"
          >
            套用模板
          </button>
        </div>
      </div>
    </div>
  );
}
