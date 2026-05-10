"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useCurrentUser } from "@/hooks/use-current-user";

interface RedeemFormProps {
  onSuccess?: () => void;
}

export function RedeemForm({ onSuccess }: RedeemFormProps) {
  const { toast } = useToast();
  const { refresh } = useCurrentUser();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/account/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();

      if (data.success) {
        toast(
          `+${data.data.addedCredits.toFixed(2)} 积分到账`,
          "success"
        );
        setCode("");
        await refresh();
        onSuccess?.();
      } else {
        setError(data.error || "兑换失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-start">
      <div className="flex-1">
        <input
          type="text"
          value={code}
          onChange={(e) =>
            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))
          }
          placeholder="CV-XXXXXXXXXXXXXXXX"
          className="w-full px-3 py-2 bg-bg border border-border rounded text-fg text-sm font-mono tracking-wider placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          maxLength={19}
        />
        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={loading || code.length < 19}
        className="px-4 py-2 bg-accent text-bg text-sm font-medium rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
      >
        {loading ? "兑换中..." : "兑换"}
      </button>
    </form>
  );
}
