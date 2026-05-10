import { getRequiredSetting } from "./system-settings";

interface GenerateParams {
  prompt: string;
  size: string;
  referenceImages?: string[];
}

interface TaskResult {
  status: "pending" | "processing" | "completed" | "failed";
  imageUrl?: string;
  error?: string;
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

export async function submitTask(params: GenerateParams): Promise<string> {
  const { baseUrl, apiKey } = await getConfig();

  const body: Record<string, unknown> = {
    model: "gpt-image-1",
    prompt: params.prompt,
    size: params.size,
    n: 1,
  };

  if (params.referenceImages && params.referenceImages.length > 0) {
    body.image = params.referenceImages;
  }

  const res = await fetch(`${baseUrl}/v1/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`生图请求失败 (${res.status}): ${text}`);
  }

  const data = await res.json();

  if (data.data?.[0]?.url) {
    return data.data[0].url;
  }

  if (data.id || data.task_id) {
    return data.id || data.task_id;
  }

  throw new Error("生图响应格式异常");
}

export async function pollTask(taskId: string): Promise<TaskResult> {
  const { baseUrl, apiKey } = await getConfig();

  const res = await fetch(`${baseUrl}/v1/images/generations/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`轮询任务失败 (${res.status}): ${text}`);
  }

  const data = await res.json();

  if (data.status === "completed" || data.data?.[0]?.url) {
    return {
      status: "completed",
      imageUrl: data.data?.[0]?.url || data.output?.url || data.url,
    };
  }

  if (data.status === "failed" || data.error) {
    return {
      status: "failed",
      error: data.error?.message || data.error || "生图失败",
    };
  }

  return { status: data.status || "processing" };
}

export async function generateImage(params: GenerateParams): Promise<string> {
  const result = await submitTask(params);

  if (result.startsWith("http")) {
    return result;
  }

  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const poll = await pollTask(result);

    if (poll.status === "completed" && poll.imageUrl) {
      return poll.imageUrl;
    }
    if (poll.status === "failed") {
      throw new Error(poll.error || "生图失败");
    }
  }

  throw new Error("生图超时，请稍后重试");
}

export type { GenerateParams, TaskResult };
