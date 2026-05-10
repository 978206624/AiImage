"use client";

import { useEffect, useRef, useState } from "react";
import { useApiKey } from "@/hooks/use-api-key";
import { useToast } from "@/components/ui/toast";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { key, isConfigured, setKey, clearKey } = useApiKey();
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setInput(key);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, key]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      toast("请输入 Key", "error");
      return;
    }
    setKey(trimmed);
    toast("Key 已保存", "success");
    onClose();
  };

  const handleClear = () => {
    clearKey();
    setInput("");
    toast("Key 已清除", "info");
  };

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface border border-border rounded-lg p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-medium text-fg mb-1">设置</h2>
        <p className="text-sm text-muted mb-5">
          输入你的 API Key 以使用生图功能
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1.5">API Key</label>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="CV-XXXXXXXXXXXXXXXX"
              className="w-full px-3 py-2 bg-bg border border-border rounded-md text-fg text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span
              className={`w-2 h-2 rounded-full ${isConfigured ? "bg-emerald-500" : "bg-muted/50"}`}
            />
            <span className="text-muted">
              {isConfigured ? "已配置" : "未配置"}
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-accent text-bg text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
            >
              保存
            </button>
            {isConfigured && (
              <button
                onClick={handleClear}
                className="px-4 py-2 text-sm text-muted border border-border rounded-md hover:text-fg hover:border-fg/30 transition-colors"
              >
                清除
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted hover:text-fg transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
