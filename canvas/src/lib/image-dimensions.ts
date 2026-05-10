import { imageSize } from "image-size";

export interface ImageDimensions {
  width: number;
  height: number;
}

export async function probeImageDimensions(
  imageUrl: string
): Promise<ImageDimensions | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const { width, height } = imageSize(buffer);
    if (!width || !height) return null;
    return { width, height };
  } catch (err) {
    console.error("[probeImageDimensions] failed", imageUrl, err);
    return null;
  }
}
