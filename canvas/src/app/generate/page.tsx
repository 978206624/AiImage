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
import { LoginPromptModal } from "@/components/generate/login-prompt-modal";
import { InsufficientBalanceModal } from "@/components/generate/insufficient-balance-modal";
import { useGeneration } from "@/hooks/use-generation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/components/ui/toast";
import type { AspectRatio, Quality } from "@/lib/size-map";

const CREDITS_PER_IMAGE = 0.07;

function GenerateContent() {
  const searchParams = useSearchParams();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const {
    loading,
    images,
    error,
    errorCode,
    remainingCredits,
    generate,
    clearResults,
  } = useGeneration();

  const [model, setModel] = useState("gpt-4o-image");
  const [prompt, setPrompt] = useState("");
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("2:3");
  const [quality, setQuality] = useState<Quality>("medium");
  const [count, setCount] = useState(1);
  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);

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
    if (!error) return;
    if (errorCode === "UNAUTHENTICATED") {
      setLoginModalOpen(true);
    } else if (errorCode === "INSUFFICIENT_BALANCE") {
      setBalanceModalOpen(true);
    } else {
      toast(error, "error");
    }
  }, [error, errorCode, toast]);

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
      stylePresetId: selectedPresetId,
    });
  };

  const modelBadge =
    model === "gpt-4o-image"
      ? "GPT-4O IMAGE"
      : model === "google-imagen-3"
        ? "GOOGLE IMAGEN 3"
        : "MIDJOURNEY V6";

  const requiredCredits = CREDITS_PER_IMAGE * count;
  const displayBalance =
    remainingCredits !== null ? remainingCredits : (user?.balance ?? 0);

  return (
    <>
      <div
        className="grid grid-cols-[256px_1fr_272px]"
        style={{
          marginTop: "var(--nav)",
          minHeight: "calc(100vh - var(--nav))",
        }}
      >
        {/* Left Panel - Model Selector */}
        <aside className="border-r border-border overflow-y-auto px-[18px] py-[28px]">
          <ModelSelector selected={model} onSelect={setModel} />
        </aside>

        {/* Center - Creation Area */}
        <main className="overflow-y-auto px-[32px] py-[24px]">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-[28px] font-normal tracking-[-0.015em]"
              style={{ fontFamily: "var(--font-d)" }}
            >
              创作提示词
            </h2>
            <span className="px-3 py-1 rounded-[3px] border border-accent-b bg-accent-d font-mono text-[10px] text-accent tracking-[.07em] uppercase">
              {modelBadge}
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
            className="w-full py-[15px] mt-1.5 bg-accent text-[oklch(11%_.01_55)] text-base font-medium tracking-[.025em] rounded-[var(--r)] hover:opacity-[.86] transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "◎ 生成中..." : "✦ 开始生图"}
          </button>

          <GenerationResult images={images} loading={loading} count={count} />
        </main>

        {/* Right Panel - Parameters */}
        <aside className="border-l border-border overflow-y-auto px-[18px] py-[28px]">
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

      <LoginPromptModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
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
