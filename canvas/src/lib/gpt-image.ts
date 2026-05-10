import { getRequiredSetting } from "./system-settings";

export type Quality = "low" | "medium" | "high" | "auto";

export interface SubmitParams {
  prompt: string;
  size: string;
  quality?: Quality;
  referenceImages?: string[];
}

export type SubmitResult =
  | { async: true; taskId: string }
  | { async: false; imageUrl: string };

export type QueryResult =
  | { status: "processing"; progress?: number }
  | { status: "completed"; imageUrl: string }
  | { status: "failed"; failReason: string };

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

export async function submitTask(params: SubmitParams): Promise<SubmitResult> {
  const { baseUrl, apiKey } = await getConfig();

  const body: Record<string, unknown> = {
    model: "gpt-image-1",
    prompt: params.prompt,
    size: params.size,
    response_format: "url",
    quality: params.quality ?? "auto",
    n: 1,
  };
  if (params.referenceImages && params.referenceImages.length > 0) {
    body.image = params.referenceImages;
  }

  const url = `${baseUrl}/v1/images/generations?async=true`;

  let res: Response;
  try {
    res = await fetch(url, {
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

  const data: unknown = await res.json();
  return parseSubmitResponse(data);
}

function parseSubmitResponse(data: unknown): SubmitResult {
  const obj = (data ?? {}) as Record<string, unknown>;

  // Async 形式：{ code:"success", data:{ task_id } }
  if (
    obj.code === "success" &&
    typeof obj.data === "object" &&
    obj.data !== null
  ) {
    const tid = (obj.data as Record<string, unknown>).task_id;
    if (typeof tid === "string" && tid) return { async: true, taskId: tid };
  }

  // Sync 形式：{ data: [{ url }] }
  if (Array.isArray(obj.data) && obj.data.length > 0) {
    const first = obj.data[0] as Record<string, unknown>;
    if (typeof first.url === "string" && first.url) {
      return { async: false, imageUrl: first.url };
    }
  }

  // Async 兜底：顶层 id / task_id
  if (typeof obj.id === "string" && obj.id) {
    return { async: true, taskId: obj.id };
  }
  if (typeof obj.task_id === "string" && obj.task_id) {
    return { async: true, taskId: obj.task_id };
  }

  throw new Error(
    `生图响应格式异常: ${JSON.stringify(data).slice(0, 200)}`
  );
}

const SUCCESS_STATUSES = ["SUCCESS", "COMPLETED", "SUCCEEDED"];
const FAIL_TERMINAL_STATUSES = [
  "FAILURE",
  "FAILED",
  "CANCELED",
  "CANCELLED",
  "EXPIRED",
  "ERROR",
  "TIMEOUT",
];

export async function queryTask(taskId: string): Promise<QueryResult> {
  const { baseUrl, apiKey } = await getConfig();
  const url = `${baseUrl}/v1/images/tasks/${encodeURIComponent(taskId)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  } catch {
    throw new Error("任务查询失败：节点暂时不可达，请稍后重试");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`任务查询失败 (${res.status}): ${text || "Unknown error"}`);
  }

  const json = (await res.json()) as Record<string, unknown>;
  const taskData = (json.data ?? json) as Record<string, unknown>;

  const statusRaw = String(taskData.status ?? "").toUpperCase();
  const progress = parseProgress(taskData.progress);

  if (SUCCESS_STATUSES.includes(statusRaw)) {
    const imageUrl = pickImageUrl(taskData);
    if (!imageUrl) {
      return { status: "failed", failReason: "任务成功但未返回图片 URL" };
    }
    return { status: "completed", imageUrl };
  }

  if (FAIL_TERMINAL_STATUSES.includes(statusRaw)) {
    const reason =
      pickString(taskData.fail_reason) ||
      pickString(taskData.error) ||
      `任务终止: ${statusRaw}`;
    return { status: "failed", failReason: reason };
  }

  if (taskData.error) {
    return { status: "failed", failReason: pickString(taskData.error) || "生成失败" };
  }

  return { status: "processing", progress };
}

function parseProgress(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseInt(value, 10);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function pickString(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  if (typeof value === "object" && value !== null) {
    const msg = (value as Record<string, unknown>).message;
    if (typeof msg === "string" && msg) return msg;
  }
  return null;
}

function pickImageUrl(taskData: Record<string, unknown>): string | null {
  // 中转协议：data.data.data[0].url
  const inner = taskData.data;
  if (typeof inner === "object" && inner !== null) {
    const innerData = (inner as Record<string, unknown>).data;
    if (Array.isArray(innerData) && innerData.length > 0) {
      const first = innerData[0] as Record<string, unknown>;
      if (typeof first.url === "string" && first.url) return first.url;
    }
  }
  // 兜底：output.url / url
  const output = taskData.output;
  if (typeof output === "object" && output !== null) {
    const u = (output as Record<string, unknown>).url;
    if (typeof u === "string" && u) return u;
  }
  if (typeof taskData.url === "string" && taskData.url) return taskData.url;
  return null;
}
