# VectorEngine 生图接口文档

更新时间：2026-05-15

本文档用于 AiImage 项目后续将生图中转站接口从当前平台切换到 VectorEngine，并接入 VectorEngine 中转站生图模型。**当前范围只包含 GPT Image 和 Google Gemini 系列，不接入 Midjourney。**

> **⚠️ API 验证结果（2026-05-15 实测）**
>
> | 接口 | 实际行为 | 说明 |
> |------|----------|------|
> | GPT Image2 `response_format=url` | ❌ 不支持 | 总是返回 `b64_json`，URL 字段为 null |
> | GPT Image2 异步任务 | ❌ 不支持 | 轮询端点返回 404 |
> | Gemini 2.5/3.1/3 Pro Flash | ✅ 可用 | 返回 `candidates[0].content.parts[0].inlineData.data` (base64) |
>
> **结论**：VectorEngine 所有图像模型都是同步返回 base64，不支持 URL 和异步轮询。**Midjourney 暂不接入（分组无可用渠道）。**

参考来源：

- VectorEngine 价格页：https://api.vectorengine.ai/pricing
- VectorEngine Apifox 文档：https://app.apifox.com/project/7109750/apis/api-349239130-run?branchId=6832198
- Google Gemini Image 文档：https://ai.google.dev/gemini-api/docs/image-generation

价格说明：

- 金额按 2026-05-15 VectorEngine 价格页显示记录。
- `x.xxxx/M` 表示按量计费，每百万单位金额；`x.xxx/次` 表示按次计费。
- 最终扣费以 VectorEngine 实际账单为准。

## 1. 基础信息

默认 Base URL：

```text
https://api.vectorengine.ai
```

项目中建议继续使用系统设置中的中转站地址，不在代码里硬编码固定域名。

迁移要求：

- 后续将当前生图中转站接口切换为 VectorEngine。
- 仍复用项目现有中转站配置入口，由管理员在系统设置中填写 VectorEngine `baseUrl` 和 API Key。
- 代码层不要写死 `https://api.vectorengine.ai`，只把它作为默认参考值和文档示例。

当前项目已有配置项：

```text
api_base_url / GPT_IMAGE_BASE_URL
api_key / GPT_IMAGE_API_KEY
```

OpenAI 兼容接口使用 Bearer Token：

```http
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

Google Gemini 原生接口使用 query key：

```text
?key=<API_KEY>
```

并设置：

```http
Content-Type: application/json
```

## 2. 接入范围

### 2.1 需要接入

| 模块 | 前端展示名 | 实际模型 / 接口 | 价格页金额 | 状态 |
| --- | --- | --- | --- | --- |
| OpenAI | GPT Image2 | `gpt-image-2` | 输入 `3.0000/M`，补全 `18.0000/M` | ✅ 已验证可用 |
| Google | Nano Banana | `gemini-2.5-flash-image` | `0.090/次` | ✅ 已验证可用 |
| Google | Nano Banana Preview | `gemini-2.5-flash-image-preview` | `0.090/次` | ✅ 已验证可用 |
| Google | Nano Banana 2 | `gemini-3.1-flash-image-preview` | `0.248/次` | ✅ 已验证可用 |
| Google | Nano Banana Pro | `gemini-3-pro-image-preview` | `0.495/次` | ✅ 已验证可用 |

### 2.2 明确不接入

以下通道不在本次范围内：

| 通道 | 原因 |
|------|------|
| Midjourney | 分组无可用渠道，暂不接入 |
| Fal.ai Nano Banana | 与 Gemini 图像模型重复，不需重复接入 |

> 💡 **提示**：后续如需接入 Midjourney，需要在 VectorEngine 后台调整分组配置。

## 3. GPT Image

当前项目已经使用 OpenAI / DALL-E 兼容格式的异步接口。模型 ID 已确认改为：

```text
gpt-image-2
```

前端展示名：

```text
GPT Image2
```

说明：展示名统一使用 `GPT Image2`，不要再显示为 `GPT-4o Image` 或 `GPT Image`。历史画廊数据中的 `model_tag = "GPT-4o Image"` 应迁移为 `GPT Image2`；前端可保留旧值兼容兜底。

价格页金额：

| 模型 | 计费方式 | 金额 |
| --- | --- | --- |
| `gpt-image-2` | 按量计费 | 输入 `3.0000/M`，补全 `18.0000/M` |

补充说明：价格页还列出 `gpt-image-2-all`，金额为 `0.120/次`，但当前项目主接入模型是 `gpt-image-2`，不默认使用 `gpt-image-2-all`。

### 3.1 提交任务

```http
POST {baseUrl}/v1/images/generations
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

> ⚠️ **实测结果**：VectorEngine 不支持异步任务，`async=true` 参数无效。所有请求都是同步返回。

请求体：

```json
{
  "model": "gpt-image-2",
  "prompt": "一只可爱的小猪",
  "size": "1024x1792",
  "quality": "auto",
  "response_format": "url",
  "n": 1
}
```

> ⚠️ **实测结果**：`response_format=url` 不起作用，VectorEngine 总是返回 `b64_json`，URL 字段为 null。
> ⚠️ **尺寸说明**：OpenAI 官方支持的竖版尺寸是 `1024x1792`，示例中已使用映射后的合法尺寸。

带参考图 / 编辑图时：

```json
{
  "model": "gpt-image-2",
  "prompt": "把图片改成电影海报风格",
  "size": "1792x1024",
  "quality": "auto",
  "response_format": "url",
  "n": 1,
  "image": [
    "data:image/png;base64,..."
  ]
}
```

> ⚠️ **尺寸说明**：横版使用 `1792x1024`。

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `model` | string | 是 | 固定传 `gpt-image-2` |
| `prompt` | string | 是 | 用户提示词 |
| `size` | string | 是 | 项目内尺寸映射后的实际像素尺寸 |
| `quality` | string | 否 | `low` / `medium` / `high` / `auto` |
| `response_format` | string | 是 | **实际不起作用，总是返回 base64** |
| `n` | number | 是 | 当前建议固定 `1` |
| `image` | string[] | 否 | 参考图数组，base64 data URL |

### 3.2 响应解析

> ⚠️ **实测响应格式**：

```json
{
  "data": [
    {
      "b64_json": "...(base64字符串)...",
      "url": null,
      "revised_prompt": null
    }
  ],
  "output_format": "png",
  "size": "1024x1024",
  "quality": "low",
  "usage": {
    "total_tokens": 198,
    "input_tokens": 2,
    "output_tokens": 196
  }
}
```

**图片提取优先级**：

1. `data[0].b64_json` ✅ （实际唯一有效字段）
2. `data[0].url` ❌ 始终为 null
3. `data[0].revised_prompt` ❌ 始终为 null

> ⚠️ **重要**：VectorEngine 不支持异步任务轮询，所有请求都是同步返回。不需要实现 `/v1/images/tasks/{id}` 端点的轮询逻辑。

**处理流程**：
1. 提交请求后直接等待同步响应
2. 解析 `data[0].b64_json` 获取 base64 数据
3. 将 base64 上传到 OSS
4. 返回 OSS URL 给前端

### 3.4 尺寸映射

> ⚠️ **重要**：OpenAI 官方支持的 GPT Image2 尺寸有限，需要做映射转换。

**OpenAI 官方支持的尺寸**：

| 尺寸值 | 说明 |
|--------|------|
| `1024x1024` | 正方形 |
| `1024x1792` | 竖版（9:16） |
| `1792x1024` | 横版（16:9） |

**项目现有尺寸 → OpenAI 尺寸映射**：

| 项目现有尺寸 | 映射后尺寸 | 说明 |
|--------------|------------|------|
| `1:1` / `1024x1024` | `1024x1024` | 直接使用 |
| `16:9` / `1536x864` / `1920x1080` | `1792x1024` | 映射到最接近的横版 |
| `9:16` / `864x1536` / `1080x1920` | `1024x1792` | 映射到最接近的竖版 |
| `4:3` / `1024x768` | `1024x1024` | 近似正方形 |
| `3:4` / `768x1024` | `1024x1024` | 近似正方形 |
| 其他尺寸 | `1024x1024` 或 `auto` | 兜底 |

**尺寸映射函数**：

```ts
function mapToOpenAISize(projectSize: string): string {
  const sizeMap: Record<string, string> = {
    '1:1': '1024x1024',
    '1024x1024': '1024x1024',
    '16:9': '1792x1024',
    '1536x864': '1792x1024',
    '1920x1080': '1792x1024',
    '9:16': '1024x1792',
    '864x1536': '1024x1792',
    '1080x1920': '1024x1792',
    '4:3': '1024x1024',
    '1024x768': '1024x1024',
    '3:4': '1024x1024',
    '768x1024': '1024x1024',
  };
  return sizeMap[projectSize] ?? '1024x1024';
}
```

**或者使用 `auto`**：如果上游支持，`auto` 可以让模型自动决定输出尺寸。

### 3.3 查询任务（不适用）

> ⚠️ **VectorEngine 不支持异步任务轮询**
>
> 端点 `GET /v1/images/tasks/{taskId}` 返回 404。所有图像请求都是同步返回，不需要实现轮询逻辑。

**如果未来需要支持长耗时任务**，建议方案：
1. 在 VectorEngine 侧配置 webhooks 回调
2. 或切换到直连 OpenAI/Google API

## 4. Google Gemini / Nano Banana

Google 生图走 Gemini 原生 `generateContent` 格式。

### 4.1 模型映射

价格页中 Google 图像模型共 4 个：

| 展示名 | 实际 model id | 计费方式 | 金额 | 说明 |
| --- | --- | --- | --- | --- |
| Google Nano Banana | `gemini-2.5-flash-image` | 按次计费 | `0.090/次` | 标准图像生成与对话式编辑 |
| Google Nano Banana Preview | `gemini-2.5-flash-image-preview` | 按次计费 | `0.090/次` | 预览版 |
| Google Nano Banana 2 | `gemini-3.1-flash-image-preview` | 按次计费 | `0.248/次` | Nano Banana 2 |
| Google Nano Banana Pro | `gemini-3-pro-image-preview` | 按次计费 | `0.495/次` | Nano Banana Pro，支持更高质量、文字渲染和复杂图像编辑 |

### 4.2 接口

通用接口：

```http
POST {baseUrl}/v1beta/models/{modeName}:generateContent?key=<API_KEY>
Content-Type: application/json
```

`modeName` 可选：

```text
gemini-2.5-flash-image
gemini-2.5-flash-image-preview
gemini-3.1-flash-image-preview
gemini-3-pro-image-preview
```

### 4.3 文生图请求

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "生成一张未来城市夜景海报，电影感，高细节"
        }
      ]
    }
  ],
  "generationConfig": {
    "responseModalities": ["IMAGE"]
  }
}
```

### 4.4 控制比例和清晰度

**注意**：以下示例基于 Google Gemini 官方 REST API 规范。VectorEngine 中转的具体字段名可能有所差异，实现前需用测试账号验证。

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "生成一张竖版产品海报"
        }
      ]
    }
  ],
  "generationConfig": {
    "responseModalities": ["IMAGE"],
    "responseFormat": {
      "image": {
        "aspectRatio": "9:16",
        "imageSize": "1K"
      }
    }
  }
}
```

项目现有比例可以映射为：

```text
1:1
16:9
9:16
4:3
3:4
2:3
```

`imageSize` 建议先从 `1K` 起步；如后续确认上游对 `2K` / `4K` 的支持和计费，再扩展质量映射。

**字段兼容性说明**：

- Google 官方使用 `responseFormat.image`（camelCase）
- 部分中转服务可能使用 `response_format.image`（snake_case）
- 项目解析时应同时兼容两种格式：

```ts
// 解析响应格式配置的兼容函数
function parseResponseFormat(config: any): { aspectRatio?: string; imageSize?: string } {
  // 兼容 camelCase
  if (config?.responseFormat?.image) {
    return config.responseFormat.image;
  }
  // 兼容 snake_case
  if (config?.response_format?.image) {
    return config.response_format.image;
  }
  // 兼容旧版 imageConfig（部分中转可能仍在使用）
  if (config?.imageConfig) {
    return config.imageConfig;
  }
  return {};
}
```

### 4.5 图像编辑请求

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "把这张图改成赛博朋克风格"
        },
        {
          "inline_data": {
            "mime_type": "image/png",
            "data": "<BASE64_IMAGE_DATA>"
          }
        }
      ]
    }
  ],
  "generationConfig": {
    "responseModalities": ["IMAGE"]
  }
}
```

注意：

- Apifox 示例使用 `inline_data` / `mime_type`。
- Google 官方响应常见字段是 `inlineData` / `mimeType`。
- 项目解析时建议同时兼容 snake_case 和 camelCase。

### 4.6 响应解析

> ⚠️ **实测响应格式（2026-05-15）**：

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "inlineData": {
              "mimeType": "image/png",
              "data": "...(base64字符串)..."
            }
          }
        ],
        "role": "model"
      },
      "finishReason": "STOP",
      "index": 0
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 4,
    "candidatesTokenCount": 1300,
    "totalTokenCount": 1304
  },
  "modelVersion": "gemini-2.5-flash-image",
  "responseId": "xxx"
}
```

图片路径：

```text
candidates[].content.parts[].inlineData.data
```

兼容路径：

```text
candidates[].content.parts[].inlineData.data
candidates[].content.parts[].inline_data.data
```

解析建议：

1. 遍历 `candidates`
2. 遍历每个 candidate 的 `content.parts`
3. **跳过 `thought: true` 的 parts**（Gemini 3.x 可能返回思考过程）
4. 收集所有非 thought 的 `inlineData` / `inline_data` 图片
5. 读取 `mimeType` 或 `mime_type`
6. 将 base64 转为图片并上传到自有 OSS
7. 如果只返回 text、没有图片数据，按失败处理并记录原始响应

**多图处理**：

```ts
interface GeminiImagePart {
  data: string;       // base64 数据
  mimeType: string;   // 图片类型
}

// 解析 Gemini 响应中的所有图片
function parseGeminiImages(response: GeminiResponse): GeminiImagePart[] {
  const images: GeminiImagePart[] = [];

  for (const candidate of response.candidates ?? []) {
    const parts = candidate.content?.parts ?? [];

    for (const part of parts) {
      // 跳过思考过程
      if ((part as any).thought === true) {
        continue;
      }

      // 兼容 inlineData 和 inline_data
      const inlineData = part.inlineData ?? (part as any).inline_data;

      if (inlineData?.data) {
        images.push({
          data: inlineData.data,
          mimeType: inlineData.mimeType ?? 'image/png'
        });
      }
    }
  }

  return images;
}
```

> ⚠️ **关于多图**：Gemini 可能一次返回多张图片。前端 `count` 参数与多图输出的关系需要明确：
> - **方案 A**：每张图片作为一个独立的本地任务
> - **方案 B**：使用 Gemini 的多图输出，一次请求生成多张
> 建议首期使用方案 A，每个 count 对应一个独立任务调用。

> ⚠️ **重要**：Gemini 2.5 Flash 已验证可用，返回 `inlineData.data` (base64)。其他 Gemini 模型需要分组配置支持。

## 5. 统一项目适配建议

建议新增 provider adapter，而不是继续把所有模型都塞进 `gpt-image.ts`。

推荐结构：

```text
openaiImageProvider      # GPT Image 系列
googleGeminiImageProvider  # Gemini 系列
# midjourneyProvider    # 暂不接入，后续需要时添加
```

统一提交结果：

> ⚠️ **VectorEngine 不支持异步任务**，所有请求都是同步返回 base64。Worker 包装后对外保持异步体验。

```ts
type SubmitResult =
  | { async: false; imageUrl: string; provider: string; raw?: unknown };
// async: true 变体暂不需要，未来直连 OpenAI API 时可能用到
```

统一查询结果（Worker 内部轮询时使用）：

```ts
type QueryResult =
  | { status: "processing"; progress?: number; raw?: unknown }
  | { status: "completed"; imageUrl: string; raw?: unknown }
  | { status: "failed"; failReason: string; raw?: unknown };
```

## 7. 同步接口异步包装方案

VectorEngine 的部分生图接口按同步方式返回结果。项目对外仍应保持异步任务体验，但不能在 Web API 请求中长时间 `await` 上游同步接口。

不推荐：

```text
前端提交 -> API Route 长时间等待 VectorEngine 同步生图 -> 返回图片
```

原因：

- 请求连接长时间占用，用户多时容易超时或 502。
- 上游慢响应会直接拖垮 Web API 并发。
- 部署、重启、异常退出时任务状态不可控。

推荐：

```text
前端提交 -> API 创建本地 task_id 并立即返回
后台 worker -> 按并发限制调用 VectorEngine 同步接口
worker 成功后 -> 转存 OSS、写历史、更新任务 completed
前端 -> 轮询项目自己的任务状态
```

### 7.1 本地任务表建议

建议使用数据库任务队列承接同步上游接口：

```text
image_tasks
- id
- user_id
- provider
- model
- prompt
- params_json
- status: pending / processing / submitted / completed / failed
- progress
- external_task_id     -- 上游任务 ID（现有字段）
- upstream_raw          -- 上游原始响应摘要
- image_url
- fail_reason
- credits_locked          -- 预锁积分
- refunded               -- 是否已退款
- locked_by               -- 领取任务的 worker 标识
- lock_expires_at        -- 锁过期时间，防止 worker 崩溃导致永久锁死
- attempt_count           -- 重试次数
- max_attempts            -- 最大重试次数（建议默认 2）
- next_run_at            -- 下次执行时间（用于延迟重试）
- idempotency_key        -- 幂等键，防止重复提交
- started_at             -- 开始处理时间
- finished_at            -- 完成时间
- created_at
- updated_at
```

**任务领取算法（MySQL/Prisma 兼容方案）**：

由于 MySQL 不支持 `RETURNING *`，使用事务内两步操作实现原子领取：

```ts
async function claimTask(workerId: string, lockTimeoutSeconds: number = 60): Promise<ImageTask | null> {
  return await prisma.$transaction(async (tx) => {
    // Step 1: 使用 FOR UPDATE SKIP LOCKED 锁定一条可领取的任务
    const task = await tx.$queryRaw<{ id: number }[]>`
      SELECT id FROM image_tasks
      WHERE status = 'pending'
        AND (next_run_at IS NULL OR next_run_at <= NOW())
        AND (lock_expires_at IS NULL OR lock_expires_at < NOW())
        AND attempt_count < COALESCE(max_attempts, 2)
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;

    if (!task || task.length === 0) {
      return null;
    }

    const taskId = task[0].id;

    // Step 2: 查询当前任务状态（用于判断是否首次处理）
    const currentTask = await tx.imageTask.findUnique({
      where: { id: taskId },
      select: { startedAt: true }
    });

    // Step 3: 更新任务状态为 processing，加锁
    const lockExpiresAt = new Date(Date.now() + lockTimeoutSeconds * 1000);
    const updated = await tx.imageTask.update({
      where: { id: taskId },
      data: {
        status: "processing",
        lockedBy: workerId,
        lockExpiresAt: lockExpiresAt,
        attemptCount: { increment: 1 },
        startedAt: currentTask?.startedAt ?? new Date(),
      },
    });

    return updated;
  }, {
    isolationLevel: 'ReadCommitted',
    timeout: 10000,
  });
}
```

**推荐索引**：

```sql
-- 确保查询高效的复合索引
CREATE INDEX idx_image_tasks_claim ON image_tasks (status, next_run_at, lock_expires_at, attempt_count, created_at);
```

**锁超时恢复机制**：

```ts
// Worker 启动时扫描超时任务
async function recoverStuckTasks() {
  // 1. 找到锁过期但状态仍为 processing 的任务
  const lockExpiredThreshold = new Date(Date.now() - 60 * 1000); // 锁超时后 1 分钟才处理

  const stuckTasks = await prisma.imageTask.findMany({
    where: {
      status: "processing",
      lockExpiresAt: { lt: lockExpiredThreshold }
    },
    select: { id: true, attemptCount: true, maxAttempts: true, lockedBy: true }
  });

  for (const task of stuckTasks) {
    const maxAttempts = task.maxAttempts ?? 2;

    if (task.attemptCount >= maxAttempts) {
      // 达到最大重试次数，标记失败
      // 使用原 lockedBy 或 'system' 作为 workerId
      await failTask(task.id, "处理超时，已达最大重试次数", task.lockedBy ?? 'system');
    } else {
      // 恢复为 pending，下次可重新领取
      await prisma.imageTask.update({
        where: { id: task.id },
        data: {
          status: "pending",
          lockedBy: null,
          lockExpiresAt: null,
          nextRunAt: new Date(Date.now() + 30 * 1000), // 延迟 30s 再执行
        }
      });
    }
  }
}
```

**幂等键与上游提交**：

> ⚠️ **重要说明**：VectorEngine 的同步生图接口没有稳定的 `external_task_id`。`external_task_id` 字段主要用于兼容现有系统，不应用于判断是否已提交。

**重试边界策略**（必须明确划分）：

```ts
interface SubmitResult {
  success: boolean;
  base64Data?: string;      // 成功时返回 base64 数据
  errorType?: 'network' | 'param' | 'upstream';  // 错误分类
  errorMessage?: string;
}

// 调用上游
async function callUpstream(task: ImageTask): Promise<SubmitResult> {
  try {
    const result = await callVectorEngine({
      model: task.model,
      prompt: task.prompt,
      // ...
    });

    // 成功，解析 base64
    const base64 = extractBase64(result); // provider 特定解析逻辑
    return { success: true, base64Data: base64 };

  } catch (error) {
    // 错误分类
    if (isNetworkError(error)) {
      // 网络错误：可重试
      return { success: false, errorType: 'network', errorMessage: error.message };
    }
    if (isParamError(error)) {
      // 参数错误：不可重试，直接失败退款
      return { success: false, errorType: 'param', errorMessage: error.message };
    }
    // 上游错误（429/503/500/504 等）：收到 HTTP 响应，禁止重试，直接失败
    return { success: false, errorType: 'upstream', errorMessage: error.message };
  }
}

// Worker 处理流程
async function processTask(task: ImageTask) {
  const workerId = task.lockedBy;  // 从已领取的任务获取 worker ID
  const result = await callUpstream(task);

  if (result.success) {
    // 上游成功，保存 base64 到 OSS
    const persistResult = await persistOutput({
      kind: 'base64',
      data: result.base64Data,
    }, task.userId);

    if (persistResult.isPersisted) {
      await completeTask(task.id, persistResult.url, workerId);
    } else {
      // OSS 失败：已扣费但无法返回图片给用户
      // 记录错误，人工处理或重试 OSS 上传
      await markTaskNeedsManualReview(task.id, persistResult.error);
    }
  } else {
    // 上游失败
    if (result.errorType === 'param') {
      // 参数错误：直接退款
      await failTask(task.id, result.errorMessage, workerId);
    } else {
      // 上游错误（429/5xx/504）：收到 HTTP 响应，禁止重试，直接失败
      // 触发熔断机制
      await failTask(task.id, result.errorMessage ?? 'upstream error', workerId);
    }
  }
}
```

**重试边界规则**：

| 阶段 | 失败原因 | 处理方式 |
|------|----------|----------|
| **网络请求发送前** | 连接失败、DNS 错误 | 自动重试，最多重试 3 次 |
| **已发送，未收到响应** | 超时、连接中断 | 自动重试，使用相同 idempotency_key（如果支持） |
| **收到上游响应** | 任何错误（成功或失败） | **不自动重试**，按错误类型处理 |

> ⚠️ **关键**：一旦收到上游响应（包括错误响应），**禁止自动重试**。因为：
> 1. 同步接口没有任务 ID，无法查询状态
> 2. 重试可能导致重复扣费
> 3. 上游已处理完成，重试只会浪费成本

**Idempotency-Key 支持情况**：

| Provider | Idempotency-Key 支持 | 说明 |
|----------|---------------------|------|
| GPT Image2 | 待测试 | 需要实测是否生效 |
| Gemini | 待测试 | 需要实测是否生效 |

> 💡 **建议**：实现前先测试 VectorEngine 是否支持 Idempotency-Key。如果支持，在重试时携带相同的 idempotency key。

### 7.2 Web API 职责

Web API 只做短流程：

1. 校验登录态。
2. 校验余额和请求参数。
3. 创建 `pending` 本地任务。
4. 返回 `taskId`。

禁止在 API Route 中使用 fire-and-forget 方式直接启动长耗时任务，例如：

```ts
void generateImageInBackground();
return taskId;
```

这种方式会在进程重启、部署、异常退出时丢任务，也不方便控制并发。

**⚠️ 与现有 PollManager 的兼容性**：

现有项目在 `canvas/src/instrumentation.ts` 中启动了 PollManager，会扫描 `pending/submitted/processing` 任务并轮询上游。

迁移到独立 Worker 时必须处理这个冲突：

| 方案 | 说明 | 风险 |
|------|------|------|
| **方案A（推荐）：完全替换** | 启用独立 Worker 后，禁用 instrumentation 中的 PollManager | 需要灰度切换 |
| **方案B：共存但分工** | 新任务走 Worker，历史任务走 PollManager | 复杂度高，不推荐 |

**迁移步骤**：

1. 部署独立 Worker，保持 PollManager 开启
2. 新建任务标记为 `source: 'worker'`，老任务保持 `source: 'poll'`
3. **修改 PollManager 扫描逻辑**：在 `poll-manager.ts` 中添加 `source: 'poll'` 过滤，只处理历史任务
   ```ts
   // poll-manager.ts 扫描条件修改
   const pending = await prisma.imageTask.findMany({
     where: {
       status: { in: RUNNABLE_STATUSES },
       source: 'poll' // 只处理历史任务
     }
   });
   ```
4. 验证 Worker 处理正常后，通过配置开关关闭 PollManager
5. 老任务全部完成后，清理 PollManager 相关代码

**⚠️ 关键**：如果 PollManager 没有加 source 过滤，新 worker 任务会被 PollManager 抢占处理，导致双重消费。

**状态机保护**：

所有任务更新必须使用带状态条件的事务，防止双处理：

```ts
// 错误示例
await prisma.imageTask.update({
  where: { id: taskId },
  data: { status: 'completed' }
});

// 正确示例：带状态条件抢占
const result = await prisma.imageTask.updateMany({
  where: {
    id: taskId,
    status: { in: ['pending', 'processing', 'submitted'] } // 幂等抢占
  },
  data: { status: 'completed' }
});

if (result.count === 0) {
  // 任务已被其他 Worker 处理，跳过
  return;
}
```

### 7.3 Worker 职责

后台 worker 负责长耗时流程：

1. 从 DB 领取 `pending` 任务并加锁（见 7.1 节原子领取算法）。
2. 标记任务为 `processing`。
3. 按 provider/model 并发上限调用 VectorEngine。
4. 成功后解析图片并转存 OSS。
5. 写入历史记录，完成扣费。
6. 更新任务为 `completed`。
7. 失败时写入 `failed`、`fail_reason` 和原始响应摘要，触发退款。

### 7.4 OSS 转存策略

> ⚠️ **核心设计**：VectorEngine 所有图像模型都返回 base64，不返回 URL。**`persistOutput` 函数专注于 base64 → OSS 路径。**

**显式输入类型设计**（避免 base64 被误判为 URL）：

```ts
// 显式输入类型，区分 base64 和 URL
type ImageSource =
  | { kind: 'base64'; data: string; mimeType?: string }  // 裸 base64 字符串
  | { kind: 'dataUrl'; data: string }                     // data:image/...;base64,... 格式
  | { kind: 'url'; url: string }                          // 图片 URL
  | { kind: 'buffer'; buffer: Buffer };                   // 原始 Buffer

interface PersistOptions {
  maxSizeBytes: number;      // 最大图片大小，默认 20MB
  uploadTimeoutMs: number;   // 上传超时，默认 30s
  maxRetries: number;        // 重试次数，默认 1
}

interface PersistResult {
  url: string;               // 最终图片 URL
  isPersisted: boolean;      // 是否成功转存到 OSS
  error?: string;            // 如果失败，记录原因
}

enum PersistErrorType {
  RETRYABLE = 'retryable',         // 可重试（网络超时等）
  NON_RETRYABLE = 'non_retryable', // 不可重试（格式错误等）
  FATAL = 'fatal'                   // 致命错误（无法处理）
}

async function persistOutput(
  source: ImageSource,
  userId: number,
  options: Partial<PersistOptions> = {}
): Promise<PersistResult> {
  const opts: PersistOptions = {
    maxSizeBytes: options.maxSizeBytes ?? 20 * 1024 * 1024,
    uploadTimeoutMs: options.uploadTimeoutMs ?? 30000,
    maxRetries: options.maxRetries ?? 1,
    ...options
  };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      let buffer: Buffer;
      let mimeType = 'image/png'; // 默认

      // 1. 解析图片数据
      if (source.kind === 'buffer') {
        buffer = source.buffer;
      } else if (source.kind === 'dataUrl') {
        // data:image/png;base64,...
        const match = source.data.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) {
          return { url: '', isPersisted: false, error: 'Invalid data URL format' };
        }
        mimeType = match[1];
        buffer = Buffer.from(match[2], 'base64');
      } else if (source.kind === 'base64') {
        // 裸 base64 字符串（GPT Image2 b64_json / Gemini inlineData.data）
        // 先检查是否是有效 base64
        if (!isValidBase64(source.data)) {
          return { url: '', isPersisted: false, error: 'Invalid base64 string' };
        }
        buffer = Buffer.from(source.data, 'base64');
        mimeType = source.mimeType ?? detectMimeType(buffer) ?? 'image/png';
      } else if (source.kind === 'url') {
        // 图片 URL - 下载（VectorEngine 不返回 URL，此路径为兼容保留）
        const response = await fetch(source.url, {
          signal: AbortSignal.timeout(opts.uploadTimeoutMs)
        });
        if (!response.ok) {
          return { url: source.url, isPersisted: false, error: `Download failed: ${response.status}` };
        }
        const contentType = response.headers.get('content-type');
        if (contentType && !contentType.startsWith('image/')) {
          return { url: source.url, isPersisted: false, error: `Not an image: ${contentType}` };
        }
        buffer = Buffer.from(await response.arrayBuffer());
        mimeType = contentType ?? 'image/png';
      }

      // 2. 大小校验
      if (buffer.length > opts.maxSizeBytes) {
        return { url: '', isPersisted: false, error: `Image too large: ${buffer.length} bytes` };
      }

      // 3. 校验图片 magic bytes
      const detectedMime = detectMimeType(buffer);
      if (!detectedMime || !detectedMime.startsWith('image/')) {
        return { url: '', isPersisted: false, error: `Not a valid image format` };
      }
      mimeType = detectedMime;

      // 4. 上传到 OSS
      const ext = mimeTypeToExt(mimeType);
      const key = `gallery/users/${userId}/${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
      const url = await uploadBufferWithTimeout(key, buffer, opts.uploadTimeoutMs);

      return { url, isPersisted: true };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[persistOutput] attempt ${attempt + 1} failed:`, lastError.message);

      const errorType = classifyError(lastError, attempt < opts.maxRetries);
      if (errorType === PersistErrorType.NON_RETRYABLE || errorType === PersistErrorType.FATAL) {
        break;
      }
    }
  }

  return { url: '', isPersisted: false, error: lastError?.message };
}

// 辅助函数
function isValidBase64(str: string): boolean {
  if (!str || str.length === 0) return false;
  // base64 长度应该是 4 的倍数
  if (str.length % 4 !== 0) return false;
  // 检查是否只包含有效字符
  return /^[A-Za-z0-9+/]*={0,2}$/.test(str);
}

function detectMimeType(buffer: Buffer): string | null {
  const magicBytes: [Buffer, string][] = [
    [[0x89, 0x50, 0x4E, 0x47], 'image/png'],
    [[0xFF, 0xD8, 0xFF], 'image/jpeg'],
    [[0x47, 0x49, 0x46, 0x38], 'image/gif'],
    [[0x52, 0x49, 0x46, 0x46], 'image/webp'], // 需要验证完整 RIFF 头
    [[0x42, 0x4D], 'image/bmp'],
  ];
  for (const [magic, mime] of magicBytes) {
    if (buffer.slice(0, magic.length).equals(Buffer.from(magic))) {
      return mime;
    }
  }
  return null;
}

function mimeTypeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
  };
  return map[mimeType] ?? 'png';
}

async function uploadBufferWithTimeout(
  key: string,
  buffer: Buffer,
  timeoutMs: number
): Promise<string> {
  const uploadPromise = uploadBuffer(key, buffer);
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Upload timeout after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([uploadPromise, timeoutPromise]);
}

function classifyError(error: Error, canRetry: boolean): PersistErrorType {
  const msg = error.message.toLowerCase();
  if (msg.includes('timeout') || msg.includes('econnreset')) {
    return canRetry ? PersistErrorType.RETRYABLE : PersistErrorType.FATAL;
  }
  if (msg.includes('not a valid image') || msg.includes('invalid')) {
    return PersistErrorType.NON_RETRYABLE;
  }
  return canRetry ? PersistErrorType.RETRYABLE : PersistErrorType.FATAL;
}
```

**Provider 调用示例**：

```ts
// GPT Image2
const gptResult = await callVectorEngine({ model: 'gpt-image-2', ... });
const gptImage = await persistOutput({
  kind: 'base64',
  data: gptResult.data[0].b64_json,
  mimeType: 'image/png'
}, userId);

// Gemini - 使用 parseGeminiImages 处理多图和思考 parts
const geminiResult = await callVectorEngine({ model: 'gemini-2.5-flash-image', ... });
const images = parseGeminiImages(geminiResult);
if (images.length === 0) {
  throw new Error('No images in Gemini response');
}
// 取第一张图片，或遍历 images 处理多图
const firstImage = images[0];
const geminiImage = await persistOutput({
  kind: 'base64',
  data: firstImage.data,
  mimeType: firstImage.mimeType
}, userId);
```

**转存失败处理策略**：

| 错误类型 | 处理方式 |
|----------|----------|
| base64 格式无效 | 任务标记为 failed，退款 |
| 图片过大 | 任务标记为 failed，退款 |
| 图片格式无效 | 任务标记为 failed，退款 |
| OSS 上传超时 | 重试，达到阈值后告警，暂停消费 |

> ⚠️ **重要**：VectorEngine 返回的 base64 没有 URL 可降级，OSS 故障时只能失败退款。建议在 worker 启动时做 OSS 连通性检查，OSS 不健康时不消费新任务。

### 7.5 并发和超时建议

初期使用 DB 队列 + 独立 worker 进程，不必一开始引入 Redis/BullMQ。

**Worker 部署策略**：

```
初期（推荐）：
├── 单实例 worker
├── 并发控制：GPT 2-5 / Gemini 1-3
├── 优点：简单、易监控、无锁竞争
└── 触发扩容条件：任务队列堆积 > 100 或平均等待 > 30s

扩展（未来）：
├── 多实例 worker + 分布式锁
├── 或使用 BullMQ + Redis
└── 注意：多实例时必须使用 7.1 节的原子领取算法防止重复处理
```

建议保守起步：

| 通道 | 初始并发建议 | 说明 |
| --- | --- | --- |
| GPT Image | 2-5 | 根据同步耗时和上游限额调整 |
| Google Gemini Image | 1-3 | 返回 base64 图片，注意内存和转存耗时 |
| **Midjourney** | ❌ 暂不接入 | 分组无可用渠道，后续配置后启用 |

其他建议：

- 每次上游调用设置明确 timeout。
- 图片成功后立即转存自有 OSS，不长期依赖上游 URL。
- worker 启动时扫描超时 `processing` 任务，按规则恢复为 `pending` 或标记失败。
- 所有 provider 原始响应建议记录摘要，方便排查上游格式变化。

### 7.6 上游失败策略

> ⚠️ **重要**：VectorEngine 同步接口，**收到任何 HTTP 响应后禁止自动重试**。重试可能导致重复扣费。

**错误分类与处理**：

| HTTP 状态码 | 错误类型 | 处理方式 |
|-------------|----------|----------|
| 400 | 参数错误 | 直接 failed，退款 |
| 401/403 | 认证错误 | 直接 failed，不退款，记录严重告警 |
| 429 | 限流 | 直接 failed，**不重试**，记录告警 |
| 500/502/503 | 服务错误 | 直接 failed，**不重试**，触发熔断 |
| 504 | 超时 | 直接 failed，**不重试**，触发熔断 |
| 其他 | 未知错误 | 直接 failed，记录告警 |

> ⚠️ **关键规则**：**收到 HTTP 响应后禁止自动重试**
> - VectorEngine 是同步接口，一旦收到响应说明请求已被处理
> - 重试可能导致重复扣费
> - 429/5xx 也已消耗资源，重试只会浪费成本

**Provider 级熔断机制**：

```ts
interface ProviderCircuitBreaker {
  provider: string;
  failureCount: number;
  lastFailureAt: Date;
  isOpen: boolean;  // true = 熔断中，暂停领取
}

const circuitBreaker: Map<string, ProviderCircuitBreaker> = new Map();

const FAILURE_THRESHOLD = 5;      // 连续失败达到此数触发熔断
const CIRCUIT_BREAK_DURATION = 5 * 60 * 1000;  // 熔断持续 5 分钟

function recordFailure(provider: string) {
  const state = circuitBreaker.get(provider) ?? {
    provider,
    failureCount: 0,
    lastFailureAt: new Date(),
    isOpen: false
  };

  state.failureCount++;
  state.lastFailureAt = new Date();

  if (state.failureCount >= FAILURE_THRESHOLD) {
    state.isOpen = true;
    console.error(`[CircuitBreaker] Provider ${provider} opened due to ${state.failureCount} consecutive failures`);
    // 发送告警
    sendAlert(`Provider ${provider} circuit breaker opened`);
  }

  circuitBreaker.set(provider, state);
}

function checkCircuitBreaker(provider: string): boolean {
  const state = circuitBreaker.get(provider);
  if (!state) return false;

  // 检查是否应该关闭熔断
  if (state.isOpen) {
    const elapsed = Date.now() - state.lastFailureAt.getTime();
    if (elapsed > CIRCUIT_BREAK_DURATION) {
      // 熔断过期，重置
      circuitBreaker.set(provider, {
        provider,
        failureCount: 0,
        lastFailureAt: new Date(),
        isOpen: false
      });
      return false;
    }
    return true; // 熔断中
  }

  return false;
}
```

**告警策略**：

| 场景 | 告警级别 | 说明 |
|------|----------|------|
| Provider 熔断打开 | 严重 | 上游服务不可用 |
| 连续 10 次 OSS 上传失败 | 警告 | OSS 可能有问题 |
| 认证错误（401/403） | 严重 | API Key 可能已失效 |
| 限流（429）频繁 | 警告 | 上游限流严重 |

## 8. 后台系统改造范围

换 VectorEngine 中转站不只是替换接口调用，也会影响后台运营、排障和计费配置。实现时需要同步改造后台系统。

### 8.1 系统设置

系统设置需要支持：

- VectorEngine Base URL。
- VectorEngine API Key。
- 当前启用 provider。
- 模型总开关。
- 默认超时时间、默认重试次数。
- 默认单次生图积分，仅作为模型未配置扣费时的兜底。

注意：代码不要硬编码 `https://api.vectorengine.ai`，由系统设置提供实际 `baseUrl`。

### 8.2 模型管理

建议新增或扩展模型配置表，统一驱动前台模型选择、后台画廊标签、任务调度和扣费。

字段建议：

```text
model_configs
- id
- display_name
- provider: openai / google
- model_id
- endpoint_type: openai_images / gemini_generate_content
- billing_type: metered / per_request
- platform_cost
- user_credit_cost
- enabled
- user_selectable
- sort_order
- concurrency_limit
- timeout_seconds
- created_at
- updated_at
```

首批模型：

| 展示名 | provider | model_id / 接口 | 平台价格 | 后台用途 |
| --- | --- | --- | --- | --- |
| GPT Image2 | openai | `gpt-image-2` | 输入 `3.0000/M`，补全 `18.0000/M` | 当前默认可用模型 |
| Google Nano Banana Pro | google | `gemini-3-pro-image-preview` | `0.495/次` | 后续可选模型 |
| Google Nano Banana 2 | google | `gemini-3.1-flash-image-preview` | `0.248/次` | 后续可选模型 |
| Google Nano Banana | google | `gemini-2.5-flash-image` | `0.090/次` | 后续可选模型 |

**数据库迁移步骤**：

现有 `image_tasks` 表需要新增字段来支持多 provider：

```sql
-- 1. 新增字段（向后兼容）
ALTER TABLE image_tasks
  ADD COLUMN provider VARCHAR(20) COMMENT '来源 provider',
  ADD COLUMN model VARCHAR(100) COMMENT '实际模型/接口名',
  ADD COLUMN params_json TEXT COMMENT '完整请求参数 JSON',
  ADD COLUMN upstream_raw TEXT COMMENT '上游原始响应摘要',
  ADD COLUMN locked_by VARCHAR(100) COMMENT '领取任务的 worker 标识',
  ADD COLUMN lock_expires_at DATETIME COMMENT '锁过期时间',
  ADD COLUMN attempt_count INT DEFAULT 0 COMMENT '重试次数',
  ADD COLUMN max_attempts INT DEFAULT 2 COMMENT '最大重试次数',
  ADD COLUMN next_run_at DATETIME COMMENT '下次执行时间',
  ADD COLUMN idempotency_key VARCHAR(100) COMMENT '幂等键',
  ADD COLUMN started_at DATETIME COMMENT '开始处理时间',
  ADD COLUMN finished_at DATETIME COMMENT '完成时间',
  ADD COLUMN source VARCHAR(20) DEFAULT 'poll' COMMENT '任务来源：poll/worker';

-- 2. 回填 GPT Image 的 provider/model（使用正确的条件）
UPDATE image_tasks
SET provider = 'openai',
    model = 'gpt-image-2',
    source = 'poll'
WHERE model IS NULL OR model = '' OR provider IS NULL;

-- 3. 为 idempotency_key 添加唯一约束（防止重复创建任务）
ALTER TABLE image_tasks
  ADD CONSTRAINT uk_image_tasks_idempotency_key UNIQUE (idempotency_key);

-- 4. 添加索引
CREATE INDEX idx_image_tasks_claim ON image_tasks (status, next_run_at, lock_expires_at, attempt_count, created_at);
CREATE INDEX idx_image_tasks_source ON image_tasks (source, status);

-- 5. 旧字段映射（兼容查询）
-- external_task_id（现有字段）保持不变
-- locked_at -> lock_expires_at（概念映射）
```

> ⚠️ **注意**：迁移前请先备份数据库，并在测试环境验证。

**前端兼容性**：

- `groupId` 轮询契约保持不变
- 任务状态返回格式保持兼容
- `imageUrl` 字段继续返回 OSS URL 或降级 URL

### 8.3 任务管理

后台需要新增或扩展生图任务列表：

- 任务 ID。
- 用户。
- provider。
- 模型展示名。
- 上游 model id / 接口类型。
- 状态：pending / processing / completed / failed。
- 进度。
- 消耗积分。
- 上游任务 ID 或本地任务 ID。
- 失败原因。
- 上游响应摘要。
- 创建时间 / 更新时间。

操作建议：

- 查看详情。
- 按状态筛选。
- 对失败任务执行重试。
- 对卡住任务恢复为 pending。
- 手动标记失败。

### 8.4 Worker 状态监控

后台需要能看到 worker 是否正常：

- 最近心跳时间。
- 当前处理中任务数。
- 各 provider/model 当前并发数。
- 最近失败任务数。
- stuck processing 任务数量。

如果 worker 长时间无心跳，后台应给出明显提示，避免用户提交任务后无人消费。

### 8.5 成本和扣费控制

**计费策略：先扣减、失败退款**

保持与现有项目一致的实现模式：

1. **提交时扣减**：用户提交生图请求时，在事务内原子扣减用户余额
2. **成功锁定**：任务完成时，将 `creditsLocked` 字段值写入 `usageRecord`
3. **失败退款**：任务失败时，将 `refunded` 标记设为 `true`，并将 `creditsLocked` 退还给用户
4. **幂等保证**：退款操作检查 `refunded` 标志，防止重复退款

```ts
// 扣费流程伪代码
async function generateImage(userId: number, modelId: string) {
  const creditsPerImage = await getUserCreditCost(modelId);
  
  // 1. 事务内扣减余额
  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { balance: { decrement: creditsPerImage } },
      select: { balance: true }
    });
    if (user.balance < 0) throw new Error("BALANCE_RACE");
    
    // 2. 创建任务，锁定积分
    const task = await tx.imageTask.create({
      data: {
        userId,
        status: "pending",
        creditsLocked: creditsPerImage,
        // ...
      }
    });
    return task;
  });
  
  return updated;
}

// 任务完成（幂等保护 + 归属校验）
async function completeTask(taskId: number, imageUrl: string, workerId: string) {
  await prisma.$transaction(async (tx) => {
    // 1. 使用状态 + 归属条件抢占，避免重复处理
    const updateResult = await tx.imageTask.updateMany({
      where: {
        id: taskId,
        lockedBy: workerId,  // 归属校验：只有当前 Worker 才能完成
        status: { in: ['processing'] }  // 只有 processing 状态才能完成
      },
      data: {
        status: 'completed',
        progress: 100,
        imageUrl,
        finishedAt: new Date()
      }
    });

    if (updateResult.count === 0) {
      // 任务已被其他 Worker 处理或不属于当前 Worker，跳过
      console.log(`[completeTask] Task ${taskId} not owned by worker ${workerId} or already processed, skipping`);
      return;
    }

    // 2. 查询任务详情
    const task = await tx.imageTask.findUnique({
      where: { id: taskId },
      select: { userId: true, creditsLocked: true, usageRecordId: true }
    });

    if (!task) return;

    // 3. 检查是否已有 usageRecord（防止重复写入）
    if (task.usageRecordId) {
      console.log(`[completeTask] Task ${taskId} already has usageRecord, skipping`);
      return;
    }

    // 4. 写入使用记录
    const usageRecord = await tx.usageRecord.create({
      data: {
        userId: task.userId,
        creditsUsed: task.creditsLocked,
        imageUrl,
        // ...
      }
    });

    // 5. 关联 usageRecord
    await tx.imageTask.update({
      where: { id: taskId },
      data: { usageRecordId: usageRecord.id }
    });
  });
}

// 任务失败退款（幂等安全 + 归属校验）
async function failTask(taskId: number, reason: string, workerId: string) {
  await prisma.$transaction(async (tx) => {
    // 1. 使用状态 + 归属条件抢占，避免重复处理（幂等）
    const updateResult = await tx.imageTask.updateMany({
      where: {
        id: taskId,
        lockedBy: workerId,  // 归属校验：只有当前 Worker 才能标记失败
        status: { in: ['pending', 'processing', 'submitted'] }
      },
      data: {
        status: 'failed',
        failReason: reason,
        finishedAt: new Date()
      }
    });

    if (updateResult.count === 0) {
      // 任务已被其他 Worker 处理或不属于当前 Worker，跳过
      console.log(`[failTask] Task ${taskId} not owned by worker ${workerId} or already processed, skipping`);
      return;
    }

    // 2. 查询任务详情
    const task = await tx.imageTask.findUnique({
      where: { id: taskId },
      select: { userId: true, creditsLocked: true, refunded: true }
    });

    if (!task) return;

    // 3. 幂等退款：只有未退款的任务才退款
    if (!task.refunded) {
      await tx.imageTask.update({
        where: { id: taskId },
        data: { refunded: true }
      });

      await tx.user.update({
        where: { id: task.userId },
        data: { balance: { increment: task.creditsLocked } }
      });
    }
  });
}
```

多模型扣费配置：

- `platform_cost` 记录 VectorEngine 价格页成本，仅用于后台参考和利润核算。
- `user_credit_cost` 记录用户实际扣费积分。
- 生成前按选中模型的 `user_credit_cost * count` 校验余额。
- 生成失败不扣费（自动退款）。
- 若某模型未配置 `user_credit_cost`，才回退系统默认单次生图积分。

## 9. 推荐上线顺序

1. 保持现有 `gpt-image-2` 通道稳定，并统一展示名为 `GPT Image2`。
2. 建立模型配置和后台模型管理，先把 GPT Image2 接入配置化。
3. 建立本地任务队列和 worker，把同步上游接口包装为项目异步任务。
4. 建立后台任务管理和 worker 状态监控。
5. 新增 `gemini-2.5-flash-image`，对应 Google Nano Banana。
6. 新增 `gemini-3.1-flash-image-preview`，对应 Google Nano Banana 2。
7. 新增 `gemini-3-pro-image-preview`，对应 Google Nano Banana Pro。

> ⚠️ **Midjourney 暂不接入**，后续在 VectorEngine 后台配置分组后可按需添加。

## 10. 关键注意事项

- **不要接 Fal.ai Nano Banana**（与 Gemini 图像模型重复）。
- **Google Nano Banana 系列走 Gemini `generateContent` 格式**。
- **Google 接口认证方式是 query `key`，不是 Bearer**。
- **VectorEngine 同步生图接口必须由项目本地任务队列和 worker 包装成异步体验**，不要让 Web API 长时间等待上游结果。
- **后台必须同步支持模型管理、任务管理、worker 状态和按模型扣费配置**。
- **VectorEngine 所有图像模型返回的是 base64**，项目应转存到自有 OSS 后再入库。
- **所有 provider 的原始响应建议记录到任务表或日志**，方便排查上游格式变化。
- **上游失败策略**：收到 HTTP 响应后禁止自动重试，参数错误直接退款，上游错误触发熔断。
