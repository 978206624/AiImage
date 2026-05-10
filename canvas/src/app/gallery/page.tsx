"use client";

import { useEffect, useState, useCallback } from "react";
import { GalleryFilters } from "@/components/gallery/gallery-filters";
import { GalleryGrid } from "@/components/gallery/gallery-grid";

interface GalleryImage {
  id: number;
  imageUrl: string;
  prompt: string;
  modelTag: string;
  styleTag: string;
  width: number | null;
  height: number | null;
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("pageSize", "40");
    if (selectedModel) params.set("model", selectedModel);
    if (selectedStyle) params.set("style", selectedStyle);

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
  }, [selectedModel, selectedStyle]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  return (
    <div className="min-h-screen pt-[var(--nav)]">
      <GalleryFilters
        selectedModel={selectedModel}
        selectedStyle={selectedStyle}
        onModelChange={setSelectedModel}
        onStyleChange={setSelectedStyle}
      />
      <div className="px-8 py-8">
        <GalleryGrid images={images} loading={loading} />
      </div>
    </div>
  );
}
