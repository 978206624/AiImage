"use client";

import { useCallback, useState } from "react";
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

interface GenerationState {
  loading: boolean;
  images: string[];
  error: string | null;
  errorCode: GenerationErrorCode | null;
  remainingCredits: number | null;
}

const initialState: GenerationState = {
  loading: false,
  images: [],
  error: null,
  errorCode: null,
  remainingCredits: null,
};

export function useGeneration() {
  const { refresh } = useCurrentUser();
  const [state, setState] = useState<GenerationState>(initialState);

  const generate = useCallback(
    async (params: {
      prompt: string;
      aspectRatio: AspectRatio;
      quality: Quality;
      count: number;
      referenceImages: ReferenceImage[];
      stylePresetId: number | null;
    }) => {
      if (!params.prompt.trim()) {
        setState((s) => ({
          ...s,
          error: "请输入提示词",
          errorCode: "OTHER",
        }));
        return;
      }

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
            stylePresetId: params.stylePresetId,
          }),
        });

        const data = await res.json();

        if (!data.success) {
          const code = mapErrorCode(res.status, data.code);
          setState({
            loading: false,
            images: [],
            error: data.error || "生成失败",
            errorCode: code,
            remainingCredits: data.remaining ?? null,
          });
          return;
        }

        setState({
          loading: false,
          images: data.images,
          error: null,
          errorCode: null,
          remainingCredits: data.remainingCredits,
        });
        await refresh();
      } catch (err) {
        setState({
          loading: false,
          images: [],
          error: err instanceof Error ? err.message : "网络错误",
          errorCode: "NETWORK",
          remainingCredits: null,
        });
      }
    },
    [refresh]
  );

  const clearResults = useCallback(() => {
    setState(initialState);
  }, []);

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
