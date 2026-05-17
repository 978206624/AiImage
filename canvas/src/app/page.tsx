"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

interface GalleryImage {
  id: number;
  imageUrl: string;
  prompt: string;
  model: string;
  style: string;
}

interface ModelItem {
  id: string;
  name: string;
  provider: string;
  creditCost: number;
}

const PROVIDER_DOT: Record<string, string> = {
  openai: "oklch(62% .18 255)",
  google: "oklch(62% .2 145)",
};

const PROVIDER_TINT: Record<string, { border: string; bg: string }> = {
  openai: {
    border: "oklch(62% .18 255 / .35)",
    bg: "oklch(62% .18 255 / .12)",
  },
  google: {
    border: "oklch(62% .2 145 / .35)",
    bg: "oklch(62% .2 145 / .12)",
  },
};

export default function Home() {
  const [featured, setFeatured] = useState<GalleryImage[]>([]);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.resolve().then(() => {
      setLoading(true);
      Promise.all([
        fetch("/api/gallery?featured=true&pageSize=5").then((r) => r.json()),
        fetch("/api/models").then((r) => r.json()),
      ])
        .then(([galleryRes, modelsRes]) => {
          if (galleryRes.success) setFeatured(galleryRes.data?.images || []);
          else setError("获取精选数据失败");
          if (modelsRes.success && modelsRes.models?.length > 0) {
            setModels(modelsRes.models);
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    });
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* base */}
        <div className="absolute inset-0 bg-bg" />

        {/* color blobs */}
        <div
          className="absolute -top-40 -left-32 w-[720px] h-[720px] rounded-full blur-[140px] animate-[blobDrift_22s_ease-in-out_infinite]"
          style={{ background: "oklch(68% 0.18 58 / 0.32)" }}
        />
        <div
          className="absolute top-1/4 -right-40 w-[640px] h-[640px] rounded-full blur-[150px] animate-[blobDrift_28s_ease-in-out_infinite_reverse]"
          style={{ background: "oklch(60% 0.22 290 / 0.22)" }}
        />
        <div
          className="absolute -bottom-32 left-1/4 w-[560px] h-[560px] rounded-full blur-[140px] animate-[blobDrift_34s_ease-in-out_infinite]"
          style={{ background: "oklch(62% 0.2 220 / 0.20)" }}
        />

        {/* grid lines */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, oklch(80% .02 60 / .5) 1px, transparent 1px), linear-gradient(to bottom, oklch(80% .02 60 / .5) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage:
              "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          }}
        />

        {/* noise */}
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            animation: "grain 8s steps(10) infinite",
          }}
        />

        {/* bottom fade to next section */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-bg to-transparent" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-8 pt-28 pb-20 grid grid-cols-1 lg:grid-cols-[5fr_6fr] gap-10 lg:gap-16 items-center">
          {/* 左：文案 + CTA */}
          <div className="animate-[fadeInUp_0.8s_ease-out]">
            <div className="flex items-center gap-2 mb-5 font-mono text-[11px] tracking-[.2em] uppercase text-muted">
              <span className="text-accent text-base leading-none">◈</span>
              <span>Mira · 拟境</span>
            </div>
            <h1
              className="text-5xl font-light tracking-tight leading-tight mb-10"
              style={{ fontFamily: "var(--font-d)" }}
            >
              用文字描绘想象，
              <br />
              让 AI 为你<span className="text-accent">创作</span>
            </h1>
            <div className="flex gap-4">
              <Link
                href="/generate"
                className="px-6 py-2.5 bg-accent text-bg text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
              >
                立即生图
              </Link>
              <Link
                href="/gallery"
                className="px-6 py-2.5 text-sm text-fg border border-border rounded-md hover:bg-surface2 transition-colors"
              >
                浏览画廊
              </Link>
            </div>
          </div>

          {/* 右：今日精选 */}
          {!error && (loading || featured.length > 0) && (
            <div className="animate-[fadeInUp_1s_ease-out_0.15s_both]">
              <div className="flex items-baseline justify-between mb-3">
                <span className="font-mono text-[10px] tracking-[.15em] uppercase text-muted">
                  今日精选
                </span>
                <Link
                  href="/gallery"
                  className="font-mono text-[10px] tracking-[.05em] text-muted hover:text-accent transition-colors"
                >
                  查看更多 →
                </Link>
              </div>
              {loading ? (
                <div className="grid grid-cols-4 grid-rows-2 gap-2.5 h-[440px]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-lg bg-surface2 animate-pulse ${
                        i === 0 ? "col-span-2 row-span-2" : ""
                      }`}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 grid-rows-2 gap-2.5 h-[440px]">
                  {featured.slice(0, 5).map((img, i) => (
                    <div
                      key={img.id}
                      className={`relative group rounded-lg overflow-hidden bg-surface2 ${
                        i === 0 ? "col-span-2 row-span-2" : ""
                      }`}
                    >
                      <Image
                        src={img.imageUrl}
                        alt={img.prompt}
                        className="w-full h-full object-cover"
                        fill
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                        <span className="text-xs text-accent mb-1">
                          {img.model}
                        </span>
                        <p className="text-sm text-white/90 line-clamp-3">
                          {img.prompt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Models */}
      {models.length > 0 && (
        <section className="px-8 py-24 max-w-6xl mx-auto">
          <h2
            className="text-2xl font-light tracking-tight mb-2"
            style={{ fontFamily: "var(--font-d)" }}
          >
            支持的模型
          </h2>
          <p className="text-sm text-muted mb-10">
            多种 AI 图像生成模型，满足不同创作需求
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {models.map((model) => {
              const dot = PROVIDER_DOT[model.provider] || "var(--muted)";
              const tint =
                PROVIDER_TINT[model.provider] || {
                  border: "var(--border)",
                  bg: "var(--surface2)",
                };
              return (
                <div
                  key={model.id}
                  className="group relative p-5 rounded-lg border bg-surface transition-all hover:translate-y-[-2px]"
                  style={{ borderColor: tint.border }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: dot }}
                    />
                    <h3 className="text-base font-medium text-fg">
                      {model.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mb-6">
                    <span
                      className="font-mono text-[10px] tracking-[.05em] px-2 py-0.5 rounded uppercase"
                      style={{ background: tint.bg, color: dot }}
                    >
                      {model.provider}
                    </span>
                    <span className="font-mono text-[10px] text-muted truncate">
                      {model.id}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className="text-2xl font-light tabular-nums text-fg"
                      style={{ fontFamily: "var(--font-d)" }}
                    >
                      {model.creditCost}
                    </span>
                    <span className="text-xs text-muted">积分 / 张</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="px-8 py-32 text-center">
        <h2
          className="text-3xl font-light tracking-tight mb-3"
          style={{ fontFamily: "var(--font-d)" }}
        >
          准备好开始创作了吗？
        </h2>
        <p className="text-muted mb-8 max-w-md mx-auto">
          从画廊获取灵感，或直接输入你的创意提示词
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/generate"
            className="px-6 py-2.5 bg-accent text-bg text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
          >
            开始创作
          </Link>
          <Link
            href="/gallery"
            className="px-6 py-2.5 text-sm text-fg border border-border rounded-md hover:bg-surface2 transition-colors"
          >
            逛画廊
          </Link>
        </div>
      </section>
    </div>
  );
}
