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

export class OpenAIImageProvider implements ImageProvider {
  readonly provider = "openai" as const;
  readonly modelId: string;
  readonly endpointType = "openai_images" as const;

  constructor(modelId: string = "gpt-image-2") {
    this.modelId = modelId;
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
      body.image = params.referenceImages;
    }

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/v1/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new Error("中转站连接失败，请检查节点地址或稍后重试");
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`生图请求失败 (${res.status}): ${text || "Unknown error"}`);
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
