"use client";

import { useCallback, useEffect } from "react";

interface LightboxProps {
  src: string;
  alt?: string;
  prompt?: string;
  model?: string;
  onClose: () => void;
}

export function Lightbox({ src, alt, prompt, model, onClose }: LightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-5 right-5 text-white/70 hover:text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        aria-label="关闭预览"
      >
        ✕
      </button>

      <div
        className="max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt || "预览图片"}
          className="max-w-full max-h-[75vh] object-contain rounded-md"
        />
        {(prompt || model) && (
          <div className="max-w-[600px] text-center px-4">
            {model && (
              <span className="inline-block px-2 py-0.5 text-xs rounded bg-accent-d text-accent mb-2">
                {model}
              </span>
            )}
            {prompt && (
              <p className="text-sm text-muted leading-relaxed line-clamp-3">
                {prompt}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
