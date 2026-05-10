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

  if (templates.length === 0) return null;

  return (
    <div>
      <span className="text-xs text-muted mb-2 block">快速套用模板</span>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => onApply(t.prompt)}
            className="shrink-0 px-3 py-1.5 text-xs rounded-full border border-border bg-surface text-muted hover:text-fg hover:border-accent/50 transition-all"
          >
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
