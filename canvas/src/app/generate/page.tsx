"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { ModelSelector } from "@/components/generate/model-selector";
import { PromptInput } from "@/components/generate/prompt-input";
import { ReferenceImages } from "@/components/generate/reference-images";
import type { ReferenceImage } from "@/components/generate/reference-images";
import { QuickTemplates } from "@/components/generate/quick-templates";
import { ParamPanel } from "@/components/generate/param-panel";
import { GenerationResult } from "@/components/generate/generation-result";
import { useGeneration } from "@/hooks/use-generation";
import { useApiKey } from "@/hooks/use-api-key";
import { useToast } from "@/components/ui/toast";
import type { AspectRatio, Quality } from "@/lib/size-map";

function GenerateContent() {
  const searchParams = useSearchParams();
  const { isConfigured } = useApiKey();
  const { toast } = useToast();
  const { loading, images, error, generate, clearResults } = useGeneration();

  const [model, setModel] = useState("gpt-4o-image");
  const [prompt, setPrompt] = useState("");
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [quality, setQuality] = useState<Quality>("medium");
  const [count, setCount] = useState(1);
  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);

  useEffect(() => {
    const p = searchParams.get("prompt");
    if (p) setPrompt(decodeURIComponent(p));

    const presets = searchParams.get("presets");
    if (presets) {
      const ids = presets.split(",").map(Number).filter(Boolean);
      if (ids.length > 0) setSelectedPresetId(ids[0]);
    }
  }, [searchParams]);

  useEffect(() => {
    if (error) toast(error, "error");
  }, [error, toast]);

  const handleGenerate = () => {
    if (!isConfigured) {
      toast("请先在设置中配置 API Key", "error");
      return;
    }
    clearResults();
    generate({
      prompt,
      aspectRatio,
      quality,
      count,
      referenceImages,
      stylePresetId: selectedPresetId,
    });
  };

  return (
    <div className="flex h-[calc(100vh-var(--nav))] mt-[var(--nav)]">
      {/* Left Panel - Model Selector */}
      <aside className="w-64 shrink-0 border-r border-border p-4 overflow-y-auto">
        <ModelSelector selected={model} onSelect={setModel} />
      </aside>

      {/* Center - Creation Area */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-fg">创作提示词</h2>
            <span className="px-2 py-0.5 text-[10px] rounded bg-accent-d text-accent">
              GPT-4o Image
            </span>
          </div>

          <PromptInput value={prompt} onChange={setPrompt} disabled={loading} />

          <ReferenceImages
            images={referenceImages}
            onChange={setReferenceImages}
            disabled={loading}
          />

          <QuickTemplates onApply={(p) => setPrompt(p)} />

          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full py-3 bg-accent text-bg font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "生成中..." : "开始生图"}
          </button>

          <GenerationResult images={images} loading={loading} count={count} />
        </div>
      </main>

      {/* Right Panel - Parameters */}
      <aside className="w-[272px] shrink-0 border-l border-border p-4 overflow-y-auto">
        <ParamPanel
          aspectRatio={aspectRatio}
          quality={quality}
          count={count}
          selectedPresetId={selectedPresetId}
          onAspectRatioChange={setAspectRatio}
          onQualityChange={setQuality}
          onCountChange={setCount}
          onPresetChange={setSelectedPresetId}
        />
      </aside>
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense>
      <GenerateContent />
    </Suspense>
  );
}
