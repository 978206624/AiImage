"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { AspectRatio, Quality } from "@/lib/size-map";
import type { ReferenceImage } from "@/components/generate/reference-images";

export type GenerationErrorCode =
  | "UNAUTHENTICATED"
  | "INSUFFICIENT_BALANCE"
  | "USER_BANNED"
  | "EMAIL_NOT_VERIFIED"
  | "NETWORK"
  | "OTHER";

export type TaskStatus =
  | "pending"
  | "submitted"
  | "processing"
  | "completed"
  | "failed";

export interface ImageTaskState {
  id: number;
  status: TaskStatus;
  progress: number;
  imageUrl: string | null;
  isPersisted: boolean;
  failReason: string | null;
}

interface GenerationState {
  loading: boolean;
  groupId: string | null;
  tasks: ImageTaskState[];
  error: string | null;
  errorCode: GenerationErrorCode | null;
}

const initialState: GenerationState = {
  loading: false,
  groupId: null,
  tasks: [],
  error: null,
  errorCode: null,
};

const POLL_INTERVAL_MS = 2_000;
const ACTIVE_GROUP_KEY = "canvas_active_group";

function isTerminal(status: TaskStatus): boolean {
  return status === "completed" || status === "failed";
}

function readActiveGroup(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(ACTIVE_GROUP_KEY);
  } catch {
    return null;
  }
}

function writeActiveGroup(groupId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (groupId) window.sessionStorage.setItem(ACTIVE_GROUP_KEY, groupId);
    else window.sessionStorage.removeItem(ACTIVE_GROUP_KEY);
  } catch {
    // ignore
  }
}

export function useGeneration() {
  const { refresh } = useCurrentUser();
  const [state, setState] = useState<GenerationState>(initialState);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollGroupIdRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollGroupIdRef.current = null;
  }, []);

  const fetchTasks = useCallback(
    async (groupId: string): Promise<ImageTaskState[] | null> => {
      try {
        const res = await fetch(
          `/api/generate/tasks?groupId=${encodeURIComponent(groupId)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (!data.success) return null;
        return (data.tasks as ImageTaskState[]) ?? [];
      } catch {
        return null;
      }
    },
    []
  );

  const tickPoll = useCallback(
    async (groupId: string) => {
      if (pollGroupIdRef.current !== groupId) return;
      const tasks = await fetchTasks(groupId);
      if (pollGroupIdRef.current !== groupId) return;
      if (!tasks) return;

      const allTerminal = tasks.length > 0 && tasks.every((t) => isTerminal(t.status));
      const anyCompletedNew = tasks.some((t) => t.status === "completed");

      setState((s) =>
        s.groupId === groupId
          ? {
              ...s,
              tasks,
              loading: !allTerminal,
            }
          : s
      );

      if (anyCompletedNew) {
        await refresh();
      }

      if (allTerminal) {
        writeActiveGroup(null);
        stopPolling();
      }
    },
    [fetchTasks, refresh, stopPolling]
  );

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // 刷新页面后恢复 active group 并继续轮询
  useEffect(() => {
    const savedGroupId = readActiveGroup();
    if (!savedGroupId) return;
    let cancelled = false;
    (async () => {
      const tasks = await fetchTasks(savedGroupId);
      if (cancelled || !tasks || tasks.length === 0) {
        if (tasks && tasks.length === 0) writeActiveGroup(null);
        return;
      }
      const allTerminal = tasks.every((t) => isTerminal(t.status));
      pollGroupIdRef.current = savedGroupId;
      setState({
        loading: !allTerminal,
        groupId: savedGroupId,
        tasks,
        error: null,
        errorCode: null,
      });
      if (allTerminal) {
        writeActiveGroup(null);
        return;
      }
      if (!pollTimerRef.current) {
        pollTimerRef.current = setInterval(
          () => void tickPoll(savedGroupId),
          POLL_INTERVAL_MS
        );
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = useCallback(
    async (params: {
      prompt: string;
      aspectRatio: AspectRatio;
      quality: Quality;
      count: number;
      referenceImages: ReferenceImage[];
      presetIds?: number[];
    }) => {
      if (!params.prompt.trim()) {
        setState((s) => ({
          ...s,
          error: "请输入提示词",
          errorCode: "OTHER",
        }));
        return;
      }

      stopPolling();
      setState({ ...initialState, loading: true });

      try {
        let refUrls: string[] | undefined;
        if (params.referenceImages.length > 0) {
          refUrls = await uploadReferenceImages(params.referenceImages);
        }

        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: params.prompt,
            aspectRatio: params.aspectRatio,
            quality: params.quality,
            count: params.count,
            referenceImages: refUrls,
            presetIds: params.presetIds?.length ? params.presetIds : undefined,
          }),
        });

        const data = await res.json();

        if (!data.success) {
          const code = mapErrorCode(res.status, data.code);
          setState({
            loading: false,
            groupId: null,
            tasks: [],
            error: data.error || "提交失败",
            errorCode: code,
          });
          return;
        }

        const groupId = data.groupId as string;
        const initialTasks: ImageTaskState[] = (
          data.tasks as Array<{ id: number }>
        ).map((t) => ({
          id: t.id,
          status: "pending" as TaskStatus,
          progress: 0,
          imageUrl: null,
          isPersisted: false,
          failReason: null,
        }));

        writeActiveGroup(groupId);
        pollGroupIdRef.current = groupId;
        setState({
          loading: true,
          groupId,
          tasks: initialTasks,
          error: null,
          errorCode: null,
        });

        await tickPoll(groupId);

        if (pollGroupIdRef.current === groupId && !pollTimerRef.current) {
          pollTimerRef.current = setInterval(
            () => void tickPoll(groupId),
            POLL_INTERVAL_MS
          );
        }
      } catch (err) {
        stopPolling();
        setState({
          loading: false,
          groupId: null,
          tasks: [],
          error: err instanceof Error ? err.message : "网络错误",
          errorCode: "NETWORK",
        });
      }
    },
    [stopPolling, tickPoll]
  );

  const clearResults = useCallback(() => {
    writeActiveGroup(null);
    stopPolling();
    setState(initialState);
  }, [stopPolling]);

  return { ...state, generate, clearResults };
}

function mapErrorCode(
  status: number,
  code: string | undefined
): GenerationErrorCode {
  if (status === 401 || code === "UNAUTHENTICATED") return "UNAUTHENTICATED";
  if (status === 402 || code === "INSUFFICIENT_BALANCE")
    return "INSUFFICIENT_BALANCE";
  if (code === "USER_BANNED") return "USER_BANNED";
  if (code === "EMAIL_NOT_VERIFIED") return "EMAIL_NOT_VERIFIED";
  return "OTHER";
}

async function uploadReferenceImages(
  images: ReferenceImage[]
): Promise<string[]> {
  const urls: string[] = [];

  for (const img of images) {
    if (img.url) {
      urls.push(img.url);
      continue;
    }
    if (!img.file) continue;

    const credRes = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: img.file.name }),
    });

    const cred = await credRes.json();
    if (!cred.success) throw new Error(cred.error || "获取上传凭证失败");

    const formData = new FormData();
    formData.append("key", cred.data.key);
    formData.append("policy", cred.data.policy);
    formData.append("OSSAccessKeyId", cred.data.OSSAccessKeyId);
    formData.append("signature", cred.data.signature);
    formData.append("success_action_status", cred.data.successActionStatus);
    formData.append("file", img.file);

    const uploadRes = await fetch(cred.data.host, {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) throw new Error("上传参考图失败");

    urls.push(`${cred.data.host}/${cred.data.key}`);
  }

  return urls;
}
