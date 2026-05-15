import "server-only";
import { getRequiredSetting } from "../system-settings";
import type { ImageProvider, SubmitParams, SubmitResult } from "./base";

const SIZE_MAP: Record<string, string> = {
  "1:1": "1024x1024",
  "1024x1024": "1024x1024",
  "16:9": "1792x1024",
  "1536x864": "1792x1024",
  "1920x1080": "1792x1024",
  "9:16": "1024x1792",
  "864x1536": "1024x1792",
  "1080x1920": "1024x1792",
  "4:3": "1024x1024",
  "1024x768": "1024x1024",
  "3:4": "1024x1024",
  "768x1024": "1024x1024",
  "2:3": "1024x1024",
};

const DEFAULT_TIMEOUT_MS = 120_000;

function mapToOpenAISize(projectSize: string): string {
  return SIZE_MAP[projectSize] ?? "1024x1024";
}

async function getConfig() {
  const baseUrl = await getRequiredSetting(
    "api_base_url",
    "GPT_IMAGE_BASE_URL",
    "GPT Image API 配置不完整，请在系统设置中配置中转站 API 地址"
  );
  const apiKey = await getRequiredSetting(
    "api_key",
    "GPT_IMAGE_API_KEY",
    "GPT Image API 配置不完整，请在系统设置中配置中转站 API Key"
  );
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

async function convertToDataUrl(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`下载参考图失败: ${res.status}`);
    }
    const contentType = res.headers.get("content-type") ?? "image/png";
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } finally {
    clearTimeout(timeout);
  }
}

export class OpenAIImageProvider implements ImageProvider {
  readonly provider = "openai" as const;
  readonly modelId: string;
  readonly endpointType = "openai_images" as const;
  private timeoutMs: number;

  constructor(modelId: string = "gpt-image-2", timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.modelId = modelId;
    this.timeoutMs = timeoutMs;
  }

  async submitTask(params: SubmitParams): Promise<SubmitResult> {
    const { baseUrl, apiKey } = await getConfig();
    const openAiSize = mapToOpenAISize(params.size);

    const body: Record<string, unknown> = {
      model: this.modelId,
      prompt: params.prompt,
      size: openAiSize,
      response_format: "url",
      quality: params.quality ?? "auto",
      n: 1,
    };

    if (params.referenceImages && params.referenceImages.length > 0) {
      const processedImages: string[] = [];
      for (const refImage of params.referenceImages) {
        if (refImage.startsWith("data:")) {
          processedImages.push(refImage);
        } else {
          try {
            const dataUrl = await convertToDataUrl(refImage);
            processedImages.push(dataUrl);
          } catch (error) {
            console.warn(`[OpenAIImageProvider] 参考图转换失败: ${error}`);
            throw new Error(`参考图处理失败: ${error instanceof Error ? error.message : "Unknown error"}`);
          }
        }
      }
      body.image = processedImages;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/v1/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`生图请求超时 (${this.timeoutMs}ms)`);
      }
      throw new Error("中转站连接失败，请检查节点地址或稍后重试");
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const status = res.status;
      let errorType = "upstream";
      if (status === 400) errorType = "param";
      else if (status === 401 || status === 403) errorType = "auth";
      else if (status === 429) errorType = "rate_limit";
      throw Object.assign(new Error(`生图请求失败 (${status}): ${text || "Unknown error"}`), { status, errorType });
    }

    const data = await res.json() as Record<string, unknown>;
    return this.parseResponse(data);
  }

  private parseResponse(data: unknown): SubmitResult {
    const obj = data as Record<string, unknown>;

    if (Array.isArray(obj.data) && obj.data.length > 0) {
      const first = obj.data[0] as Record<string, unknown>;

      if (typeof first.b64_json === "string" && first.b64_json) {
        return {
          async: false,
          imageData: {
            b64_json: first.b64_json,
            mimeType: "image/png",
            data: first.b64_json,
          },
          raw: data,
        };
      }

      if (typeof first.url === "string" && first.url) {
        return {
          async: false,
          imageData: {
            mimeType: "image/png",
            data: first.url,
          },
          raw: data,
        };
      }
    }

    throw new Error(`生图响应格式异常: ${JSON.stringify(data).slice(0, 200)}`);
  }
}

export const openAIImageProvider = new OpenAIImageProvider();
