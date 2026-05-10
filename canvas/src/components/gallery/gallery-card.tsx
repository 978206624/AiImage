"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

interface GalleryCardProps {
  image: {
    id: number;
    imageUrl: string;
    prompt: string;
    modelTag: string;
    styleTag: string;
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

  return (
    <div className="group relative rounded-lg overflow-hidden break-inside-avoid mb-3">
      <img
        src={image.imageUrl}
        alt={image.prompt}
        className="w-full block rounded-lg"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-4">
        <span className="self-start px-2 py-0.5 text-[10px] rounded bg-accent/20 text-accent">
          {image.modelTag}
        </span>
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
