"use client";

import { GalleryCard } from "./gallery-card";

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

interface GalleryGridProps {
  images: GalleryImage[];
  loading: boolean;
}

const SKELETON_RATIOS = [
  "3 / 4", "1 / 1", "4 / 5", "3 / 4", "5 / 4", "3 / 4",
  "4 / 5", "1 / 1", "3 / 4", "5 / 4", "4 / 5", "3 / 4",
];

export function GalleryGrid({ images, loading }: GalleryGridProps) {
  if (loading) {
    return (
      <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
        {SKELETON_RATIOS.map((ratio, i) => (
          <div
            key={i}
            className="mb-3 rounded-lg bg-surface2 animate-pulse break-inside-avoid"
            style={{ aspectRatio: ratio }}
          />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="text-muted text-sm">暂无图片</p>
      </div>
    );
  }

  return (
    <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
      {images.map((img) => (
        <GalleryCard key={img.id} image={img} />
      ))}
    </div>
  );
}
