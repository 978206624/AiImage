export const MODELS = [
  {
    id: "gpt-4o-image",
    name: "GPT-4o Image",
    description: "OpenAI 旗舰图像生成模型，支持高质量写实与创意风格",
    available: true,
  },
  {
    id: "google-imagen-3",
    name: "Google Imagen 3",
    description: "Google 最新图像生成模型，擅长自然场景与细节",
    available: false,
  },
  {
    id: "midjourney-v6",
    name: "Midjourney v6",
    description: "艺术风格图像生成，擅长概念艺术与插画",
    available: false,
  },
] as const;

export const ASPECT_RATIOS = [
  { label: "2:3", value: "2:3" },
  { label: "1:1", value: "1:1" },
  { label: "16:9", value: "16:9" },
  { label: "9:16", value: "9:16" },
  { label: "4:3", value: "4:3" },
  { label: "3:4", value: "3:4" },
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
  { href: "/templates", label: "模板库" },
  { href: "/generate", label: "生图" },
] as const;
