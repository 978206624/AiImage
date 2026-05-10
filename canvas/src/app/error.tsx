"use client";

import { useEffect, useMemo } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const errorId = useMemo(
    () => error.digest || Math.random().toString(36).slice(2, 10),
    [error.digest]
  );

  useEffect(() => {
    console.error("[GlobalError]", errorId, error);
  }, [error, errorId]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-bg">
      <div className="w-12 h-12 rounded-full border-2 border-accent/40 flex items-center justify-center mb-6">
        <span className="text-accent text-lg">!</span>
      </div>
      <h1 className="text-xl font-medium text-fg mb-2">出了点问题</h1>
      <p className="text-sm text-muted mb-6 max-w-sm">
        页面遇到了意外错误。你可以尝试重试，或返回首页。
      </p>
      <div className="flex gap-3 mb-8">
        <button
          onClick={reset}
          className="px-5 py-2 bg-accent text-bg text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
        >
          重试
        </button>
        <a
          href="/"
          className="px-5 py-2 text-sm text-fg border border-border rounded-md hover:bg-surface2 transition-colors"
        >
          返回首页
        </a>
      </div>
      <p className="text-xs text-muted/60">
        错误 ID：<code className="font-mono">{errorId}</code>
      </p>
    </div>
  );
}
