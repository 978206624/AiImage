"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { GalleryFilters } from "@/components/gallery/gallery-filters";
import { GalleryGrid } from "@/components/gallery/gallery-grid";

interface Category {
  id: number;
  name: string;
}

interface GalleryImage {
  id: number;
  imageUrl: string;
  prompt: string;
  modelTag: string;
  styleTag: string;
  title: string | null;
  category: { id: number; name: string } | null;
  width: number | null;
  height: number | null;
}

function GalleryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  const [selectedModel, setSelectedModel] = useState<string | null>(
    searchParams.get("model")
  );
  const [selectedStyle, setSelectedStyle] = useState<string | null>(
    searchParams.get("style")
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    () => {
      const v = searchParams.get("categoryId");
      return v ? parseInt(v) || null : null;
    }
  );

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCategories(d.data);
      })
      .catch(() => {});
  }, []);

  const syncUrl = useCallback(
    (model: string | null, style: string | null, catId: number | null) => {
      const params = new URLSearchParams();
      if (model) params.set("model", model);
      if (style) params.set("style", style);
      if (catId) params.set("categoryId", String(catId));
      const qs = params.toString();
      router.replace(qs ? `/gallery?${qs}` : "/gallery", { scroll: false });
    },
    [router]
  );

  const handleModelChange = (v: string | null) => {
    setSelectedModel(v);
    syncUrl(v, selectedStyle, selectedCategoryId);
  };
  const handleStyleChange = (v: string | null) => {
    setSelectedStyle(v);
    syncUrl(selectedModel, v, selectedCategoryId);
  };
  const handleCategoryChange = (v: number | null) => {
    setSelectedCategoryId(v);
    syncUrl(selectedModel, selectedStyle, v);
  };

  const fetchImages = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("pageSize", "40");
    if (selectedModel) params.set("model", selectedModel);
    if (selectedStyle) params.set("style", selectedStyle);
    if (selectedCategoryId) params.set("categoryId", String(selectedCategoryId));

    try {
      const res = await fetch(`/api/gallery?${params}`);
      const json = await res.json();
      if (json.success) {
        setImages(json.data?.images || []);
      }
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [selectedModel, selectedStyle, selectedCategoryId]);

  useEffect(() => {
    void Promise.resolve().then(() => fetchImages());
  }, [fetchImages]);

  return (
    <div className="min-h-screen pt-[var(--nav)]">
      <GalleryFilters
        selectedModel={selectedModel}
        selectedStyle={selectedStyle}
        selectedCategoryId={selectedCategoryId}
        categories={categories}
        onModelChange={handleModelChange}
        onStyleChange={handleStyleChange}
        onCategoryChange={handleCategoryChange}
      />
      <div className="px-8 py-8">
        <GalleryGrid images={images} loading={loading} />
      </div>
    </div>
  );
}

export default function GalleryPage() {
  return (
    <Suspense>
      <GalleryContent />
    </Suspense>
  );
}
