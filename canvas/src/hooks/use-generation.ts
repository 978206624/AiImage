"use client";

import { useCallback, useState } from "react";
import { useApiKey } from "@/hooks/use-api-key";
import type { AspectRatio, Quality } from "@/lib/size-map";
import type { ReferenceImage } from "@/components/generate/reference-images";

interface GenerationState {
  loading: boolean;
  images: string[];
  error: string | null;
  remainingCredits: number | null;
}

export function useGeneration() {
  const { key } = useApiKey();
  const [state, setState] = useState<GenerationState>({
    loading: false,
    images: [],
    error: null,
    remainingCredits: null,
  });

  const generate = useCallback(
    async (params: {
      prompt: string;
      aspectRatio: AspectRatio;
      quality: Quality;
      count: number;
      referenceImages: ReferenceImage[];
      stylePresetId: number | null;
    }) => {
      if (!key) {
        setState((s) => ({ ...s, error: "请先在设置中配置 API Key" }));
        return;
      }

      if (!params.prompt.trim()) {
        setState((s) => ({ ...s, error: "请输入提示词" }));
        return;
      }

      setState({ loading: true, images: [], error: null, remainingCredits: null });

      try {
        let refUrls: string[] | undefined;
        if (params.referenceImages.length > 0) {
          refUrls = await uploadReferenceImages(params.referenceImages, key);
        }

        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key,
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
          setState({
            loading: false,
            images: [],
            error: data.error || "生成失败",
            remainingCredits: data.remaining ?? null,
          });
          return;
        }

        setState({
          loading: false,
          images: data.images,
          error: null,
          remainingCredits: data.remainingCredits,
        });
      } catch (err) {
        setState({
          loading: false,
          images: [],
          error: err instanceof Error ? err.message : "网络错误",
          remainingCredits: null,
        });
      }
    },
    [key]
  );

  const clearResults = useCallback(() => {
    setState({ loading: false, images: [], error: null, remainingCredits: null });
  }, []);

  return { ...state, generate, clearResults };
}

async function uploadReferenceImages(
  images: ReferenceImage[],
  apiKey: string
): Promise<string[]> {
  const urls: string[] = [];

  for (const img of images) {
    const credRes = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: apiKey, filename: img.file.name }),
    });

    const cred = await credRes.json();
    if (!cred.success) throw new Error("获取上传凭证失败");

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
