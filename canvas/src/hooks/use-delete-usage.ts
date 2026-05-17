"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/components/ui/toast";

export interface DeleteTarget {
  id: number;
  promptSummary: string | null;
}

interface UseDeleteUsageOptions {
  onDeleted: (id: number) => void;
}

export function useDeleteUsage<T extends DeleteTarget>({
  onDeleted,
}: UseDeleteUsageOptions) {
  const { toast } = useToast();
  const [pendingDelete, setPendingDelete] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirm = useCallback(async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setDeleting(true);
    try {
      const res = await fetch(`/api/usage/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        onDeleted(id);
        toast("已删除", "success");
        setPendingDelete(null);
      } else {
        toast(json.error || "删除失败", "error");
      }
    } catch {
      toast("网络错误", "error");
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, onDeleted, toast]);

  const cancel = useCallback(() => {
    if (!deleting) setPendingDelete(null);
  }, [deleting]);

  return { pendingDelete, deleting, setPendingDelete, confirm, cancel };
}
