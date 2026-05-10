"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CategoryFilter } from "@/components/templates/category-filter";
import { TemplateCard } from "@/components/templates/template-card";
import { PresetCard } from "@/components/templates/preset-card";

interface Category {
  id: number;
  name: string;
}

interface Template {
  id: number;
  name: string;
  prompt: string;
  coverImageUrl: string | null;
  category: { id: number; name: string } | null;
}

interface Preset {
  id: number;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
}

type Tab = "templates" | "presets";

export default function TemplatesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("templates");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPresets, setSelectedPresets] = useState<Set<number>>(new Set());
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingPresets, setLoadingPresets] = useState(true);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setCategories(res.data || []);
      })
      .catch(() => {});
  }, []);

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    const params = new URLSearchParams({ pageSize: "30" });
    if (selectedCategory) params.set("categoryId", String(selectedCategory));

    try {
      const res = await fetch(`/api/templates?${params}`);
      const json = await res.json();
      if (json.success) setTemplates(json.data?.templates || []);
    } catch {
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    setLoadingPresets(true);
    fetch("/api/presets")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setPresets(res.data || []);
      })
      .catch(() => setPresets([]))
      .finally(() => setLoadingPresets(false));
  }, []);

  const togglePreset = (id: number) => {
    setSelectedPresets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyPresets = () => {
    const ids = Array.from(selectedPresets).join(",");
    router.push(`/generate?presets=${ids}`);
  };

  return (
    <div className="min-h-screen pt-[var(--nav)]">
      {/* Header */}
      <div className="px-8 pt-12 pb-8 max-w-6xl mx-auto">
        <h1
          className="text-3xl font-light tracking-tight mb-2"
          style={{ fontFamily: "var(--font-d)" }}
        >
          模板库
        </h1>
        <p className="text-sm text-muted mb-8">
          从精选模板和风格预设中获取灵感，快速开始创作
        </p>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          <button
            onClick={() => setTab("templates")}
            className={`px-4 py-2.5 text-sm transition-colors relative ${
              tab === "templates" ? "text-fg" : "text-muted hover:text-fg"
            }`}
          >
            提示词模板
            {tab === "templates" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
          <button
            onClick={() => setTab("presets")}
            className={`px-4 py-2.5 text-sm transition-colors relative ${
              tab === "presets" ? "text-fg" : "text-muted hover:text-fg"
            }`}
          >
            风格预设
            {tab === "presets" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-24 max-w-6xl mx-auto">
        {tab === "templates" && (
          <>
            <div className="mb-6">
              <CategoryFilter
                categories={categories}
                selected={selectedCategory}
                onChange={setSelectedCategory}
              />
            </div>
            {loadingTemplates ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-lg bg-surface2 animate-pulse h-72" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-muted text-sm">暂无模板</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((t) => (
                  <TemplateCard key={t.id} template={t} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === "presets" && (
          <>
            {loadingPresets ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-lg bg-surface2 animate-pulse aspect-square" />
                ))}
              </div>
            ) : presets.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-muted text-sm">暂无预设</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {presets.map((p) => (
                  <PresetCard
                    key={p.id}
                    preset={p}
                    selected={selectedPresets.has(p.id)}
                    onToggle={togglePreset}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Preset action bar */}
      {tab === "presets" && selectedPresets.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-md border-t border-border px-8 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <span className="text-sm text-muted">
              已选择 <span className="text-fg font-medium">{selectedPresets.size}</span> 个预设
            </span>
            <button
              onClick={applyPresets}
              className="px-5 py-2 text-sm text-bg bg-accent rounded-md hover:opacity-90 transition-opacity"
            >
              应用至生图界面
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
