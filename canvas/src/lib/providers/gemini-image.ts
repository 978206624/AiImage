import "server-only";
import { getRequiredSetting } from "../system-settings";
import type { ImageProvider, SubmitParams, SubmitResult, ImageData } from "./base";

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType?: string;
    data?: string;
  };
  inline_data?: {
    mimeType?: string;
    data?: string;
  };
  thought?: boolean;
}

interface GeminiContent {
  role?: string;
  parts: GeminiPart[];
}

interface GeminiCandidate {
  content?: {
    parts: GeminiPart[];
    role?: string;
  };
  finishReason?: string;
  index?: number;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  modelVersion?: string;
  responseId?: string;
}

async function getConfig() {
  const baseUrl = await getRequiredSetting(
    "api_base_url",
    "GPT_IMAGE_BASE_URL",
    "Gemini API 配置不完整，请在系统设置中配置中转站 API 地址"
  );
  const apiKey = await getRequiredSetting(
    "api_key",
    "GPT_IMAGE_API_KEY",
    "Gemini API 配置不完整，请在系统设置中配置中转站 API Key"
  );
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

export class GeminiImageProvider implements ImageProvider {
  readonly provider = "google" as const;
  readonly modelId: string;
  readonly endpointType = "gemini_generate_content" as const;

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  async submitTask(params: SubmitParams): Promise<SubmitResult> {
    const { baseUrl, apiKey } = await getConfig();

    const parts: GeminiPart[] = [];

    if (params.referenceImages && params.referenceImages.length > 0) {
      for (const refImage of params.referenceImages) {
        const base64Match = refImage.match(/^data:([^;]+);base64,(.+)$/);
        if (base64Match) {
          parts.push({
            inlineData: {
              mimeType: base64Match[1],
              data: base64Match[2],
            },
          });
        } else {
          parts.push({
            inlineData: {
              mimeType: "image/png",
              data: refImage,
            },
          });
        }
      }
    }

    parts.push({ text: params.prompt });

    const body: Record<string, unknown> = {
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
      },
    };

    let res: Response;
    try {
      res = await fetch(
        `${baseUrl}/v1beta/models/${this.modelId}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
    } catch {
      throw new Error("Gemini API 连接失败，请检查节点地址或稍后重试");
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Gemini 请求失败 (${res.status}): ${text || "Unknown error"}`);
    }

    const data = (await res.json()) as GeminiResponse;
    return this.parseResponse(data);
  }

  private parseResponse(data: GeminiResponse): SubmitResult {
    const images = this.extractImages(data);

    if (images.length === 0) {
      throw new Error("Gemini 响应中未找到图片");
    }

    const firstImage = images[0];
    return {
      async: false,
      imageData: firstImage,
      raw: data,
    };
  }

  extractImages(data: GeminiResponse): ImageData[] {
    const images: ImageData[] = [];

    if (!data.candidates) {
      return images;
    }

    for (const candidate of data.candidates) {
      const parts = candidate.content?.parts ?? [];

      for (const part of parts) {
        if ((part as GeminiPart).thought === true) {
          continue;
        }

        const inlineData = (part as GeminiPart).inlineData ?? (part as GeminiPart).inline_data;

        if (inlineData?.data) {
          images.push({
            b64_json: inlineData.data,
            mimeType: inlineData.mimeType ?? "image/png",
            data: inlineData.data,
          });
        }
      }
    }

    return images;
  }
}

export function createGeminiProvider(modelId: string): GeminiImageProvider {
  return new GeminiImageProvider(modelId);
}
