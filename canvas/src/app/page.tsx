"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { MODELS } from "@/lib/constants";

interface GalleryImage {
  id: number;
  imageUrl: string;
  prompt: string;
  model: string;
  style: string;
}

export default function Home() {
  const [featured, setFeatured] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.resolve().then(() => {
      setLoading(true);
      fetch("/api/gallery?featured=true&pageSize=5")
        .then((r) => r.json())
        .then((res) => {
          if (res.success) setFeatured(res.data?.images || []);
          else setError("获取精选数据失败");
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    });
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative h-screen flex items-end overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-bg via-surface to-bg" />
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            animation: "grain 8s steps(10) infinite",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />

        <div className="relative z-10 px-8 pb-24 max-w-3xl animate-[fadeInUp_0.8s_ease-out]">
          <span className="inline-block px-3 py-1 text-xs tracking-wider uppercase text-accent border border-accent/30 rounded-full mb-6">
            AI 图像生成平台
          </span>
          <h1
            className="text-5xl font-light tracking-tight leading-tight mb-4"
            style={{ fontFamily: "var(--font-d)" }}
          >
            用文字描绘想象，
            <br />
            让 AI 为你<span className="text-accent">创作</span>
          </h1>
          <p className="text-lg text-muted max-w-lg mb-8 leading-relaxed">
            输入提示词，选择风格，几秒内获得高质量 AI 图像。
            无需注册，买卡即用。
          </p>
          <div className="flex gap-4">
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
              浏览画廊
            </Link>
          </div>
        </div>
      </section>

      {/* Models */}
      <section className="px-8 py-24 max-w-5xl mx-auto">
        <h2
          className="text-2xl font-light tracking-tight mb-2"
          style={{ fontFamily: "var(--font-d)" }}
        >
          支持的模型
        </h2>
        <p className="text-sm text-muted mb-10">
          多种 AI 图像生成模型，满足不同创作需求
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODELS.map((model) => (
            <div
              key={model.id}
              className={`relative p-6 rounded-lg border transition-colors ${
                model.available
                  ? "border-accent/30 bg-accent-d"
                  : "border-border bg-surface"
              }`}
            >
              <div
                className={`absolute top-4 right-4 px-2 py-0.5 text-xs rounded ${
                  model.available
                    ? "bg-accent/20 text-accent"
                    : "bg-surface2 text-muted"
                }`}
              >
                {model.available ? "可用" : "即将支持"}
              </div>
              <h3 className="text-base font-medium text-fg mb-1">
                {model.name}
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                {model.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured */}
      {!error && (loading || featured.length > 0) && (
        <section className="px-8 py-24 max-w-5xl mx-auto">
          <h2
            className="text-2xl font-light tracking-tight mb-2"
            style={{ fontFamily: "var(--font-d)" }}
          >
            今日精选
          </h2>
          <p className="text-sm text-muted mb-10">
            社区精选 AI 生成作品，hover 查看提示词
          </p>
          {loading ? (
            <div className="grid grid-cols-4 grid-rows-2 gap-3 h-[480px]">
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
            <div className="grid grid-cols-4 grid-rows-2 gap-3 h-[480px]">
              {featured.slice(0, 5).map((img, i) => (
                <div
                  key={img.id}
                  className={`relative group rounded-lg overflow-hidden ${
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
                    <span className="text-xs text-accent mb-1">{img.model}</span>
                    <p className="text-sm text-white/90 line-clamp-3">
                      {img.prompt}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
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
