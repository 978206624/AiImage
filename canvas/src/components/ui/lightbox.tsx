"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface LightboxProps {
  src: string;
  alt?: string;
  prompt?: string;
  model?: string;
  onClose: () => void;
}

interface ViewState {
  scale: number;
  tx: number;
  ty: number;
}

const INITIAL_VIEW: ViewState = { scale: 1, tx: 0, ty: 0 };
const MIN_SCALE = 0.2;
const MAX_SCALE = 10;
const ZOOM_SPEED = 0.0015;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function Lightbox({ src, alt, prompt, model, onClose }: LightboxProps) {
  const [view, setView] = useState<ViewState>(INITIAL_VIEW);
  const [dragging, setDragging] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragStart = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
  } | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "0") setView(INITIAL_VIEW);
      else if (e.key === "+" || e.key === "=") {
        setView((v) => ({ ...v, scale: clamp(v.scale * 1.2, MIN_SCALE, MAX_SCALE) }));
      } else if (e.key === "-" || e.key === "_") {
        setView((v) => ({ ...v, scale: clamp(v.scale / 1.2, MIN_SCALE, MAX_SCALE) }));
      }
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

  // 切换 src 时重置视图
  useEffect(() => {
    setView(INITIAL_VIEW);
  }, [src]);

  // 滚轮缩放（必须 native listener + passive:false 才能 preventDefault）
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = stage.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      setView((v) => {
        const factor = 1 - e.deltaY * ZOOM_SPEED;
        const nextScale = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE);
        const ratio = nextScale / v.scale;
        // 让光标位置在缩放后保持不动：光标到当前图心的偏移 = (cx - tx, cy - ty)
        // 缩放后偏移变为 ratio 倍，新 tx' = cx - ratio*(cx - tx)
        return {
          scale: nextScale,
          tx: cx - ratio * (cx - v.tx),
          ty: cy - ratio * (cy - v.ty),
        };
      });
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, []);

  // 拖拽平移
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setView((v) => ({
        ...v,
        tx: dragStart.current!.tx + dx,
        ty: dragStart.current!.ty + dy,
      }));
    };
    const onUp = () => {
      if (dragStart.current) {
        dragStart.current = null;
        setDragging(false);
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragStart.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
    setDragging(true);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setView(INITIAL_VIEW);
  };

  return (
    <div
      className="fixed inset-0 z-[9998] bg-black/85 backdrop-blur-sm select-none"
      onClick={onClose}
    >
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-10 text-white/70 hover:text-white text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        aria-label="关闭预览"
      >
        ✕
      </button>

      {/* 操作提示 + 缩放比例 */}
      <div className="absolute top-5 left-5 z-10 flex items-center gap-3 text-white/60 text-xs font-mono">
        <span className="px-2 py-1 rounded bg-white/10">
          {Math.round(view.scale * 100)}%
        </span>
        <span className="hidden sm:inline">滚轮缩放 · 拖拽平移 · 双击复位 · ESC 退出</span>
      </div>

      {/* 缩放工具栏 */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white/10 rounded-full px-1 py-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setView((v) => ({
              ...v,
              scale: clamp(v.scale / 1.2, MIN_SCALE, MAX_SCALE),
            }));
          }}
          className="w-8 h-8 flex items-center justify-center text-white/80 hover:bg-white/15 rounded-full transition-colors"
          aria-label="缩小"
        >
          −
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setView(INITIAL_VIEW);
          }}
          className="px-3 h-8 flex items-center justify-center text-white/80 hover:bg-white/15 rounded-full text-xs transition-colors"
          aria-label="复位"
        >
          复位
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setView((v) => ({
              ...v,
              scale: clamp(v.scale * 1.2, MIN_SCALE, MAX_SCALE),
            }));
          }}
          className="w-8 h-8 flex items-center justify-center text-white/80 hover:bg-white/15 rounded-full transition-colors"
          aria-label="放大"
        >
          +
        </button>
      </div>

      {/* 舞台：占满，监听 wheel/拖拽 */}
      <div
        ref={stageRef}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{ cursor: dragging ? "grabbing" : "grab" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt || "预览图片"}
          draggable={false}
          className="max-w-[90vw] max-h-[85vh] object-contain rounded-md will-change-transform"
          style={{
            transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
            transition: dragging ? "none" : "transform 0.08s ease-out",
          }}
        />
      </div>

      {/* 底部 prompt + model（不阻挡舞台事件） */}
      {(prompt || model) && (
        <div
          className="absolute bottom-16 left-1/2 -translate-x-1/2 max-w-[600px] text-center px-4 pointer-events-none z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {model && (
            <span className="inline-block px-2 py-0.5 text-xs rounded bg-accent-d text-accent mb-2">
              {model}
            </span>
          )}
          {prompt && (
            <p className="text-sm text-white/80 leading-relaxed line-clamp-3">
              {prompt}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
