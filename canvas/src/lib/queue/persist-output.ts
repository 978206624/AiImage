import "server-only";
import crypto from "crypto";
import { uploadBuffer } from "../oss";

export interface ImageSource {
  kind: "base64" | "dataUrl" | "url" | "buffer";
  data: string;
  mimeType?: string;
}

export interface PersistOptions {
  maxSizeBytes: number;
  uploadTimeoutMs: number;
  maxRetries: number;
}

export interface PersistResult {
  url: string;
  isPersisted: boolean;
  error?: string;
}

export enum PersistErrorType {
  RETRYABLE = "retryable",
  NON_RETRYABLE = "non_retryable",
  FATAL = "fatal",
}

const DEFAULT_OPTIONS: PersistOptions = {
  maxSizeBytes: 20 * 1024 * 1024,
  uploadTimeoutMs: 30000,
  maxRetries: 1,
};

function isValidBase64(str: string): boolean {
  if (!str || str.length === 0) return false;
  if (str.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]*={0,2}$/.test(str);
}

function detectMimeType(buffer: Buffer): string | null {
  const magicBytes: [number[], string][] = [
    [[0x89, 0x50, 0x4e, 0x47], "image/png"],
    [[0xff, 0xd8, 0xff], "image/jpeg"],
    [[0x47, 0x49, 0x46, 0x38], "image/gif"],
    [[0x52, 0x49, 0x46, 0x46], "image/webp"],
    [[0x42, 0x4d], "image/bmp"],
  ];

  for (const [magic, mime] of magicBytes) {
    const magicBuffer = Buffer.from(magic);
    if (buffer.slice(0, magic.length).equals(magicBuffer)) {
      return mime;
    }
  }

  return null;
}

function mimeTypeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/bmp": "bmp",
  };
  return map[mimeType] ?? "png";
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
  if (msg.includes("timeout") || msg.includes("econnreset")) {
    return canRetry ? PersistErrorType.RETRYABLE : PersistErrorType.FATAL;
  }
  if (msg.includes("not a valid image") || msg.includes("invalid")) {
    return PersistErrorType.NON_RETRYABLE;
  }
  return canRetry ? PersistErrorType.RETRYABLE : PersistErrorType.FATAL;
}

export async function persistOutput(
  source: ImageSource,
  userId: number,
  options: Partial<PersistOptions> = {}
): Promise<PersistResult> {
  const opts: PersistOptions = { ...DEFAULT_OPTIONS, ...options };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      let buffer: Buffer;
      let mimeType = "image/png";

      if (source.kind === "buffer") {
        buffer = Buffer.from(source.data, "base64");
      } else if (source.kind === "dataUrl") {
        const match = source.data.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) {
          return { url: "", isPersisted: false, error: "Invalid data URL format" };
        }
        mimeType = match[1];
        buffer = Buffer.from(match[2], "base64");
      } else if (source.kind === "base64") {
        if (!isValidBase64(source.data)) {
          return { url: "", isPersisted: false, error: "Invalid base64 string" };
        }
        buffer = Buffer.from(source.data, "base64");
        mimeType = source.mimeType ?? detectMimeType(buffer) ?? "image/png";
      } else if (source.kind === "url") {
        const response = await fetch(source.data, {
          signal: AbortSignal.timeout(opts.uploadTimeoutMs),
        });
        if (!response.ok) {
          return { url: source.data, isPersisted: false, error: `Download failed: ${response.status}` };
        }
        const contentType = response.headers.get("content-type");
        if (contentType && !contentType.startsWith("image/")) {
          return { url: source.data, isPersisted: false, error: `Not an image: ${contentType}` };
        }
        buffer = Buffer.from(await response.arrayBuffer());
        mimeType = contentType ?? "image/png";
      } else {
        return { url: "", isPersisted: false, error: "Unknown source kind" };
      }

      if (buffer.length > opts.maxSizeBytes) {
        return {
          url: "",
          isPersisted: false,
          error: `Image too large: ${buffer.length} bytes (max ${opts.maxSizeBytes})`,
        };
      }

      const detectedMime = detectMimeType(buffer);
      if (!detectedMime || !detectedMime.startsWith("image/")) {
        return { url: "", isPersisted: false, error: "Not a valid image format" };
      }
      mimeType = detectedMime;

      const ext = mimeTypeToExt(mimeType);
      const key = `gallery/users/${userId}/${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`;
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

  return { url: "", isPersisted: false, error: lastError?.message };
}
