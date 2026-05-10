"use client";

import { useEffect, useState } from "react";

interface Template {
  id: number;
  name: string;
  prompt: string;
}

interface QuickTemplatesProps {
  onApply: (prompt: string) => void;
}

export function QuickTemplates({ onApply }: QuickTemplatesProps) {
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    fetch("/api/templates?pageSize=10")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setTemplates(d.data.slice(0, 10));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="mb-3.5">
      <div className="flex items-center justify-between mb-[9px]">
        <span className="text-[13px] font-medium tracking-[.02em]">
          快速套用模板
        </span>
      </div>
      <div className="flex gap-[7px] flex-nowrap overflow-x-auto pb-1">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => onApply(t.prompt)}
            className="shrink-0 px-3 py-[5px] text-xs rounded-full border border-border text-muted hover:border-accent hover:text-accent hover:bg-accent-d transition-all"
          >
            {t.name}
          </button>
        ))}
        <a
          href="/templates"
          className="shrink-0 px-3 py-[5px] text-xs rounded-full border border-border text-muted hover:border-accent hover:text-accent hover:bg-accent-d transition-all"
        >
          更多模板 →
        </a>
      </div>
    </div>
  );
}
