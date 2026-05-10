"use client";

import { GalleryCard } from "./gallery-card";

interface GalleryImage {
  id: number;
  imageUrl: string;
  prompt: string;
  modelTag: string;
  styleTag: string;
}

interface GalleryGridProps {
  images: GalleryImage[];
  loading: boolean;
}

export function GalleryGrid({ images, loading }: GalleryGridProps) {
  if (loading) {
    return (
      <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="mb-3 rounded-lg bg-surface2 animate-pulse break-inside-avoid"
            style={{ height: `${200 + Math.random() * 160}px` }}
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
