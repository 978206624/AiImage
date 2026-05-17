"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { ModelSelector } from "@/components/generate/model-selector";
import { PromptInput } from "@/components/generate/prompt-input";
import { ReferenceImages } from "@/components/generate/reference-images";
import type { ReferenceImage } from "@/components/generate/reference-images";
import { ParamPanel } from "@/components/generate/param-panel";
import { GenerationResult } from "@/components/generate/generation-result";
import { LoginPromptModal } from "@/components/generate/login-prompt-modal";
import { InsufficientBalanceModal } from "@/components/generate/insufficient-balance-modal";
import { StylePickerModal } from "@/components/generate/style-picker-modal";
import type { StylePreset } from "@/components/generate/style-picker-modal";
import { RecentHistory } from "@/components/generate/recent-history";
import type { HistoryItem } from "@/components/generate/recent-history";
import { useGeneration } from "@/hooks/use-generation";
import { useAuthModal } from "@/components/layout/auth-modal-context";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/components/ui/toast";
import type { AspectRatio, Quality } from "@/lib/size-map";

const CREDITS_PER_IMAGE = 0.07;
const REUSE_KEY = "canvas_reuse_params";

const VALID_ASPECT: AspectRatio[] = [
  "2:3",
  "1:1",
  "16:9",
  "9:16",
  "4:3",
  "3:4",
];
const VALID_QUALITY: Quality[] = ["low", "medium", "high"];

function isAspectRatio(v: unknown): v is AspectRatio {
  return typeof v === "string" && VALID_ASPECT.includes(v as AspectRatio);
}
function isQuality(v: unknown): v is Quality {
  return typeof v === "string" && VALID_QUALITY.includes(v as Quality);
}

function GenerateContent() {
  const searchParams = useSearchParams();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const {
    submitting,
    loading,
    tasks,
    error,
    errorCode,
    generate,
    clearResults,
  } = useGeneration();

  const [model, setModel] = useState("gpt-image-2");
  const [modelCreditCost, setModelCreditCost] = useState(CREDITS_PER_IMAGE);
  const [prompt, setPrompt] = useState("");
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("2:3");
  const [quality, setQuality] = useState<Quality>("medium");
  const [count, setCount] = useState(1);
  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);
  const [presets, setPresets] = useState<StylePreset[]>([]);

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [stylePickerOpen, setStylePickerOpen] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const authModal = useAuthModal();

  const selectedPreset = useMemo(
    () =>
      selectedPresetId != null
        ? presets.find((p) => p.id === selectedPresetId) ?? null
        : null,
    [presets, selectedPresetId]
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/presets")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.success) setPresets(d.data as StylePreset[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleReuse = useCallback(
    (item: HistoryItem) => {
      if (item.prompt) setPrompt(item.prompt);
      else if (item.promptSummary) setPrompt(item.promptSummary);
      if (isAspectRatio(item.aspectRatio)) setAspectRatio(item.aspectRatio);
      if (isQuality(item.quality)) setQuality(item.quality);
      if (item.count === 1 || item.count === 2 || item.count === 4) {
        setCount(item.count);
      }
      setSelectedPresetId(item.stylePresetId ?? null);
      setReferenceImages(
        item.referenceImages.map((url, idx) => ({
          id: `reuse-${Date.now()}-${idx}`,
          preview: url,
          url,
        }))
      );
      toast("已复用历史参数", "success");
    },
    [toast]
  );

  useEffect(() => {
    const p = searchParams.get("prompt");
    if (p) {
      void Promise.resolve().then(() => setPrompt(decodeURIComponent(p)));
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(REUSE_KEY);
    if (!raw) return;
    sessionStorage.removeItem(REUSE_KEY);
    try {
      const item = JSON.parse(raw) as HistoryItem;
      void Promise.resolve().then(() => handleReuse(item));
    } catch {
      // ignore
    }
  }, [handleReuse]);

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  useEffect(() => {
    if (completedCount > 0) {
      void Promise.resolve().then(() => setHistoryRefreshKey((k) => k + 1));
    }
  }, [completedCount]);

  useEffect(() => {
    if (!error) return;
    void Promise.resolve().then(() => {
      if (errorCode === "UNAUTHENTICATED") {
        setLoginModalOpen(true);
      } else if (errorCode === "INSUFFICIENT_BALANCE") {
        setBalanceModalOpen(true);
      } else {
        toast(error, "error");
      }
    });
  }, [error, errorCode, toast]);

  const handleStyleApply = (id: number | null) => {
    setSelectedPresetId(id);
    setStylePickerOpen(false);
  };

  const handleModelsLoaded = useCallback((models: { id: string; creditCost: number }[]) => {
    const current = models.find((m) => m.id === model);
    if (current) setModelCreditCost(current.creditCost);
  }, [model]);

  const handleModelSelect = useCallback((id: string, creditCost?: number) => {
    setModel(id);
    if (typeof creditCost === "number") {
      setModelCreditCost(creditCost);
    }
  }, []);

  const handleGenerate = () => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    const required = modelCreditCost * count;
    if (user.balance < required) {
      setBalanceModalOpen(true);
      return;
    }
    clearResults();
    generate({
      prompt,
      aspectRatio,
      quality,
      count,
      model,
      referenceImages,
      presetIds: selectedPresetId != null ? [selectedPresetId] : [],
    });
  };

  const modelBadge = model.toUpperCase();

  const requiredCredits = modelCreditCost * count;
  const displayBalance = user?.balance ?? 0;

  return (
    <>
      <div
        className="grid grid-cols-[260px_1fr_300px]"
        style={{
          marginTop: "var(--nav)",
          minHeight: "calc(100vh - var(--nav))",
        }}
      >
        {/* Left - 生图配置 */}
        <aside className="border-r border-border overflow-y-auto px-[18px] py-[28px] flex flex-col gap-[22px]">
          <ModelSelector
            selected={model}
            onSelect={handleModelSelect}
            onModelsLoaded={handleModelsLoaded}
          />
          <ParamPanel
            aspectRatio={aspectRatio}
            quality={quality}
            count={count}
            onAspectRatioChange={setAspectRatio}
            onQualityChange={setQuality}
            onCountChange={setCount}
          />
        </aside>

        {/* Center - 创作区（提示词 + 生图按钮） */}
        <main className="overflow-y-auto px-[32px] py-[24px]">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-[28px] font-normal tracking-[-0.015em]"
              style={{ fontFamily: "var(--font-d)" }}
            >
              生图工作台
            </h2>
            <span className="px-3 py-1 rounded-[3px] border border-accent-b bg-accent-d font-mono text-[10px] text-accent tracking-[.07em] uppercase">
              {modelBadge}
            </span>
          </div>

          <PromptInput
            value={prompt}
            onChange={setPrompt}
            disabled={submitting}
            stylePreset={
              selectedPreset
                ? {
                    id: selectedPreset.id,
                    name: selectedPreset.name,
                    coverImageUrl: selectedPreset.coverImageUrl,
                  }
                : null
            }
            onStyleClick={() => setStylePickerOpen(true)}
            onRemoveStyle={() => setSelectedPresetId(null)}
          />

          <ReferenceImages
            images={referenceImages}
            onChange={setReferenceImages}
            disabled={submitting}
          />

          <button
            onClick={handleGenerate}
            disabled={submitting || !prompt.trim()}
            className="w-full py-[15px] mt-1.5 bg-accent text-[oklch(11%_.01_55)] text-base font-medium tracking-[.025em] rounded-[var(--r)] hover:opacity-[.86] transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "◎ 提交中..." : "✦ 开始生图"}
          </button>

          <GenerationResult tasks={tasks} loading={loading} count={count} />
        </main>

        {/* Right Panel - 历史记录 */}
        <aside className="border-l border-border overflow-y-auto px-[18px] py-[28px]">
          <RecentHistory
            onReuse={handleReuse}
            refreshKey={historyRefreshKey}
          />
        </aside>
      </div>

      <StylePickerModal
        open={stylePickerOpen}
        selectedId={selectedPresetId}
        presets={presets}
        onApply={handleStyleApply}
        onClose={() => setStylePickerOpen(false)}
      />
      <LoginPromptModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onAuth={(mode) => {
          setLoginModalOpen(false);
          authModal.openModal(mode);
        }}
      />
      <InsufficientBalanceModal
        open={balanceModalOpen}
        balance={displayBalance}
        required={requiredCredits}
        onClose={() => setBalanceModalOpen(false)}
      />
    </>
  );
}

export default function GeneratePage() {
  return (
    <Suspense>
      <GenerateContent />
    </Suspense>
  );
}
