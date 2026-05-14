"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useToast } from "@/components/ui/toast";

interface GalleryCardProps {
  image: {
    id: number;
    imageUrl: string;
    prompt: string;
    modelTag: string;
    styleTag: string;
    title: string | null;
    category: { id: number; name: string } | null;
    width: number | null;
    height: number | null;
  };
}

export function GalleryCard({ image }: GalleryCardProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleCopyPrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(image.prompt);
    toast("提示词已复制", "success");
  };

  const handleUseForGeneration = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/generate?prompt=${encodeURIComponent(image.prompt)}`);
  };

  const aspectRatio =
    image.width && image.height ? `${image.width} / ${image.height}` : "4 / 5";

  return (
    <div className="group relative rounded-lg overflow-hidden break-inside-avoid mb-3">
      <div
        className="w-full bg-surface2"
        style={{ aspectRatio }}
      >
        <Image
          src={image.imageUrl}
          alt={image.prompt}
          className="w-full h-full block rounded-lg object-cover"
          loading="lazy"
          width={image.width ?? 512}
          height={image.height ?? 512}
          unoptimized
        />
      </div>
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-2">
          {image.title && (
            <span className="text-xs text-white font-medium line-clamp-1">
              {image.title}
            </span>
          )}
          <span className="shrink-0 ml-auto px-2 py-0.5 text-[10px] rounded bg-accent/20 text-accent">
            {image.modelTag}
          </span>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-white/80 line-clamp-3 leading-relaxed">
            {image.prompt}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCopyPrompt}
              className="flex-1 px-2 py-1.5 text-[11px] text-fg bg-surface2/80 rounded border border-border hover:bg-surface2 transition-colors"
            >
              复制提示词
            </button>
            <button
              onClick={handleUseForGeneration}
              className="flex-1 px-2 py-1.5 text-[11px] text-bg bg-accent rounded hover:opacity-90 transition-opacity"
            >
              用此生图
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
