type AspectRatio = "2:3" | "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
type Quality = "low" | "medium" | "high";

interface SizeConfig {
  width: number;
  height: number;
  size: string;
}

const SIZE_MAP: Record<Quality, Record<AspectRatio, SizeConfig>> = {
  low: {
    "2:3": { width: 512, height: 768, size: "512x768" },
    "1:1": { width: 512, height: 512, size: "512x512" },
    "16:9": { width: 768, height: 432, size: "768x432" },
    "9:16": { width: 432, height: 768, size: "432x768" },
    "4:3": { width: 640, height: 480, size: "640x480" },
    "3:4": { width: 480, height: 640, size: "480x640" },
  },
  medium: {
    "2:3": { width: 768, height: 1152, size: "768x1152" },
    "1:1": { width: 1024, height: 1024, size: "1024x1024" },
    "16:9": { width: 1152, height: 648, size: "1152x648" },
    "9:16": { width: 648, height: 1152, size: "648x1152" },
    "4:3": { width: 1024, height: 768, size: "1024x768" },
    "3:4": { width: 768, height: 1024, size: "768x1024" },
  },
  high: {
    "2:3": { width: 1024, height: 1536, size: "1024x1536" },
    "1:1": { width: 1536, height: 1536, size: "1536x1536" },
    "16:9": { width: 1536, height: 864, size: "1536x864" },
    "9:16": { width: 864, height: 1536, size: "864x1536" },
    "4:3": { width: 1536, height: 1152, size: "1536x1152" },
    "3:4": { width: 1152, height: 1536, size: "1152x1536" },
  },
};

export function getSize(
  aspectRatio: AspectRatio,
  quality: Quality
): SizeConfig {
  return SIZE_MAP[quality][aspectRatio];
}

export type { AspectRatio, Quality, SizeConfig };
