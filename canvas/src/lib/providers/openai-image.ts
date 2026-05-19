import "server-only";
import { getRequiredSetting } from "../system-settings";
import type { ImageProvider, SubmitParams, SubmitResult } from "./base";

const SIZE_MAP: Record<string, string> = {
  "512x512": "512x512",
  "512x768": "512x768",
  "432x768": "432x768",
  "640x480": "640x480",
  "480x640": "480x640",
  "768x432": "768x432",
  "1024x1024": "1024x1024",
  "768x1152": "768x1152",
  "648x1152": "648x1152",
  "1024x768": "1024x768",
  "768x1024": "768x1024",
  "1152x648": "1152x648",
  "1024x1536": "1024x1536",
  "1536x1536": "1536x1536",
  "864x1536": "864x1536",
  "1536x864": "1536x864",
  "1536x1152": "1536x1152",
  "1152x1536": "1152x1536",
};

const DEFAULT_TIMEOUT_MS = 120_000;
const REFERENCE_DOWNLOAD_TIMEOUT_MS = 30_000;

interface ReferenceImageUpload {
  blob: Blob;
  filename: string;
}

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

function extensionFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[contentType] ?? "png";
}

function filenameFromUrl(url: string, contentType: string, index: number): string {
  try {
    const pathname = new URL(url).pathname;
    const filename = decodeURIComponent(pathname.split("/").pop() ?? "");
    if (filename && /\.[a-z0-9]+$/i.test(filename)) return filename;
  } catch {
    // fall through
  }
  return `reference-${index + 1}.${extensionFromContentType(contentType)}`;
}

async function downloadReferenceImage(
  url: string,
  index: number
): Promise<ReferenceImageUpload> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REFERENCE_DOWNLOAD_TIMEOUT_MS
  );

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`下载参考图失败: ${res.status}`);
    }

    const contentType =
      res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
    if (!contentType.startsWith("image/")) {
      throw new Error(`参考图不是图片: ${contentType}`);
    }

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength === 0) {
      throw new Error("参考图为空");
    }

    return {
      blob: new Blob([buffer], { type: contentType }),
      filename: filenameFromUrl(url, contentType, index),
    };
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
    const size = mapToOpenAISize(params.size);
    const referenceImages = params.referenceImages
      ?.map((refImage) => refImage.trim())
      .filter(Boolean);
    const hasReferenceImages = referenceImages && referenceImages.length > 0;

    let url = `${baseUrl}/v1/images/generations`;
    let body: BodyInit;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
    };

    if (hasReferenceImages) {
      url = `${baseUrl}/v1/images/edits`;
      const formData = new FormData();
      formData.append("model", this.modelId);
      formData.append("prompt", params.prompt);
      formData.append("size", size);
      formData.append("response_format", "url");
      formData.append("n", "1");

      const files = await Promise.all(
        referenceImages.map((refImage, index) =>
          downloadReferenceImage(refImage, index)
        )
      );
      for (const file of files) {
        formData.append("image", file.blob, file.filename);
      }

      body = formData;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify({
        model: this.modelId,
        prompt: params.prompt,
        size: size,
        response_format: "url",
        n: 1,
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers,
        body,
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
