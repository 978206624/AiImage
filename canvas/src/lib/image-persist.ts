import "server-only";
import crypto from "crypto";
import { uploadBuffer } from "./oss";

export interface PersistResult {
  url: string;
  isPersisted: boolean;
}

function inferExtension(contentType: string | null): string {
  if (!contentType) return "png";
  const ct = contentType.toLowerCase();
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  return "png";
}

export async function persistImage(
  sourceUrl: string,
  userId: number
): Promise<PersistResult> {
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) {
      throw new Error(`fetch source failed: ${res.status}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get("content-type");
    const ext = inferExtension(contentType);
    const key = `gallery/users/${userId}/${Date.now()}_${crypto
      .randomBytes(4)
      .toString("hex")}.${ext}`;
    const url = await uploadBuffer(
      key,
      buffer,
      contentType || `image/${ext}`
    );
    return { url, isPersisted: true };
  } catch (err) {
    console.error("[image-persist] failed:", {
      sourceUrl,
      userId,
      error: err instanceof Error ? err.message : err,
    });
    return { url: sourceUrl, isPersisted: false };
  }
}
