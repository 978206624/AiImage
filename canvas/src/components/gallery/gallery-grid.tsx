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

const SKELETON_HEIGHTS = [
  220, 320, 240, 280, 200, 340, 260, 300, 230, 290, 250, 310,
];

export function GalleryGrid({ images, loading }: GalleryGridProps) {
  if (loading) {
    return (
      <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
        {SKELETON_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className="mb-3 rounded-lg bg-surface2 animate-pulse break-inside-avoid"
            style={{ height: `${h}px` }}
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
