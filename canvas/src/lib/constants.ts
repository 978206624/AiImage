export const MODELS = [
  {
    id: "gpt-4o-image",
    name: "GPT Image2",
    description: "OpenAI GPT Image 2 生图模型，支持高质量写实与创意风格",
    available: true,
  },
  {
    id: "google-nano-banana-pro",
    name: "Google Nano Banana Pro",
    description: "Google 新一代高质量图像生成与编辑模型，适合复杂设计、文字与产品图场景",
    available: false,
  },
  {
    id: "midjourney-v7",
    name: "Midjourney V7",
    description: "Midjourney 当前稳定图像模型，适合风格化视觉、概念艺术与插画",
    available: false,
  },
] as const;

export const ASPECT_RATIOS = [
  { value: "2:3", label: "2∶3", iconW: 18, iconH: 24 },
  { value: "1:1", label: "1∶1", iconW: 22, iconH: 22 },
  { value: "16:9", label: "16∶9", iconW: 26, iconH: 16 },
  { value: "9:16", label: "9∶16", iconW: 18, iconH: 26 },
  { value: "4:3", label: "4∶3", iconW: 24, iconH: 18 },
  { value: "3:4", label: "3∶4", iconW: 18, iconH: 24 },
] as const;

export const QUALITY_OPTIONS = [
  { label: "低", value: "low" },
  { label: "中", value: "medium" },
  { label: "高", value: "high" },
] as const;

export const GENERATION_COUNTS = [1, 2, 4] as const;

export const NAV_LINKS = [
  { href: "/", label: "首页" },
  { href: "/gallery", label: "画廊" },
  { href: "/generate", label: "生图" },
] as const;

export const GPT_IMAGE_DISPLAY_NAME = "GPT Image2";
export const GPT_IMAGE_LEGACY_MODEL_TAG = "GPT-4o Image";
export const GPT_IMAGE_MODEL_TAG_VALUES = [
  GPT_IMAGE_DISPLAY_NAME,
  GPT_IMAGE_LEGACY_MODEL_TAG,
] as const;

export function normalizeModelTag(modelTag: string): string {
  if (
    modelTag === GPT_IMAGE_LEGACY_MODEL_TAG ||
    modelTag === "GPT-4O Image" ||
    modelTag === "GPT Image" ||
    modelTag === "gpt-4o-image"
  ) {
    return GPT_IMAGE_DISPLAY_NAME;
  }
  return modelTag;
}
