"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";
import { ModelSelector } from "@/components/generate/model-selector";
import { PromptInput } from "@/components/generate/prompt-input";
import { ReferenceImages } from "@/components/generate/reference-images";
import type { ReferenceImage } from "@/components/generate/reference-images";
import { ParamPanel } from "@/components/generate/param-panel";
import { GenerationResult } from "@/components/generate/generation-result";
import { LoginPromptModal } from "@/components/generate/login-prompt-modal";
import { InsufficientBalanceModal } from "@/components/generate/insufficient-balance-modal";
import { StylePickerModal } from "@/components/generate/style-picker-modal";
import { RecentHistory } from "@/components/generate/recent-history";
import type { HistoryItem } from "@/components/generate/recent-history";
import { useGeneration } from "@/hooks/use-generation";
import { useAuthModal } from "@/components/layout/auth-modal-context";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/components/ui/toast";
import { GPT_IMAGE_DISPLAY_NAME } from "@/lib/constants";
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
    loading,
    tasks,
    error,
    errorCode,
    generate,
    clearResults,
  } = useGeneration();

  const [model, setModel] = useState("gpt-4o-image");
  const [prompt, setPrompt] = useState("");
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("2:3");
  const [quality, setQuality] = useState<Quality>("medium");
  const [count, setCount] = useState(1);
  const [selectedPresetIds, setSelectedPresetIds] = useState<number[]>([]);

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [stylePickerOpen, setStylePickerOpen] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const authModal = useAuthModal();

  const handleReuse = useCallback(
    (item: HistoryItem) => {
      if (item.prompt) setPrompt(item.prompt);
      else if (item.promptSummary) setPrompt(item.promptSummary);
      if (isAspectRatio(item.aspectRatio)) setAspectRatio(item.aspectRatio);
      if (isQuality(item.quality)) setQuality(item.quality);
      if (item.count === 1 || item.count === 2 || item.count === 4) {
        setCount(item.count);
      }
      if (item.stylePresetId) {
        setSelectedPresetIds([item.stylePresetId]);
      } else {
        setSelectedPresetIds([]);
      }
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

  const handleStyleApply = (ids: number[], prefixes: string[]) => {
    setSelectedPresetIds(ids);
    if (prefixes.length > 0) {
      const prefix = prefixes.join("\n");
      const cleaned = prompt.trimStart();
      setPrompt(cleaned ? `${prefix}\n${cleaned}` : prefix);
    }
    setStylePickerOpen(false);
  };

  const handleGenerate = () => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    const required = CREDITS_PER_IMAGE * count;
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
      referenceImages,
      presetIds: selectedPresetIds,
    });
  };

  const modelBadge =
    model === "gpt-4o-image"
      ? GPT_IMAGE_DISPLAY_NAME.toUpperCase()
      : model === "google-nano-banana-pro"
        ? "GOOGLE NANO BANANA PRO"
        : "MIDJOURNEY V7";

  const requiredCredits = CREDITS_PER_IMAGE * count;
  const displayBalance = user?.balance ?? 0;

  return (
    <>
      <div
        className="grid grid-cols-[256px_1fr_272px]"
        style={{
          marginTop: "var(--nav)",
          minHeight: "calc(100vh - var(--nav))",
        }}
      >
        {/* Left Panel - Model Selector + Recent History */}
        <aside className="border-r border-border overflow-y-auto px-[18px] py-[28px]">
          <ModelSelector selected={model} onSelect={setModel} />
          <div className="h-px bg-border my-5" />
          <RecentHistory
            onReuse={handleReuse}
            refreshKey={historyRefreshKey}
          />
        </aside>

        {/* Center - Creation Area */}
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
            disabled={loading}
            styleCount={selectedPresetIds.length}
            onStyleClick={() => setStylePickerOpen(true)}
          />

          <ReferenceImages
            images={referenceImages}
            onChange={setReferenceImages}
            disabled={loading}
          />

          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full py-[15px] mt-1.5 bg-accent text-[oklch(11%_.01_55)] text-base font-medium tracking-[.025em] rounded-[var(--r)] hover:opacity-[.86] transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "◎ 生成中..." : "✦ 开始生图"}
          </button>

          <GenerationResult tasks={tasks} loading={loading} count={count} />
        </main>

        {/* Right Panel - Parameters */}
        <aside className="border-l border-border overflow-y-auto px-[18px] py-[28px]">
          <ParamPanel
            aspectRatio={aspectRatio}
            quality={quality}
            count={count}
            onAspectRatioChange={setAspectRatio}
            onQualityChange={setQuality}
            onCountChange={setCount}
          />
        </aside>
      </div>

      <StylePickerModal
        open={stylePickerOpen}
        selectedIds={selectedPresetIds}
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
