import crypto from "crypto";
import OSS from "ali-oss";
import { getRequiredSetting, getSetting } from "./system-settings";

interface OssConfig {
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  region: string;
  endpoint: string;
}

interface UploadCredentials {
  host: string;
  key: string;
  policy: string;
  signature: string;
  OSSAccessKeyId: string;
  successActionStatus: string;
}

async function getOssConfig(): Promise<OssConfig> {
  const accessKeyId = await getRequiredSetting(
    "oss_access_key_id",
    "OSS_ACCESS_KEY_ID",
    "OSS 配置不完整，请在系统设置中配置 AccessKey ID"
  );
  const accessKeySecret = await getRequiredSetting(
    "oss_access_key_secret",
    "OSS_ACCESS_KEY_SECRET",
    "OSS 配置不完整，请在系统设置中配置 AccessKey Secret"
  );
  const bucket = await getRequiredSetting(
    "oss_bucket",
    "OSS_BUCKET",
    "OSS 配置不完整，请在系统设置中配置 Bucket"
  );
  const region = await getRequiredSetting(
    "oss_region",
    "OSS_REGION",
    "OSS 配置不完整，请在系统设置中配置 Region"
  );
  const endpoint =
    (await getSetting("oss_endpoint", "OSS_ENDPOINT")) ??
    `${region}.aliyuncs.com`;

  return { accessKeyId, accessKeySecret, bucket, region, endpoint };
}

function buildHost(bucket: string, endpoint: string): string {
  return endpoint.startsWith("http")
    ? `${endpoint}/${bucket}`
    : `https://${bucket}.${endpoint}`;
}

export async function generateUploadCredentials(
  dir: string,
  filename: string
): Promise<UploadCredentials> {
  const config = await getOssConfig();

  const ext = filename.substring(filename.lastIndexOf("."));
  const key = `${dir}/${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;

  const expiration = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const policy = {
    expiration,
    conditions: [
      { bucket: config.bucket },
      ["starts-with", "$key", dir],
      ["content-length-range", 0, 20 * 1024 * 1024],
    ],
  };

  const policyBase64 = Buffer.from(JSON.stringify(policy)).toString("base64");
  const signature = crypto
    .createHmac("sha1", config.accessKeySecret)
    .update(policyBase64)
    .digest("base64");

  return {
    host: buildHost(config.bucket, config.endpoint),
    key,
    policy: policyBase64,
    signature,
    OSSAccessKeyId: config.accessKeyId,
    successActionStatus: "200",
  };
}

export async function getPublicUrl(key: string): Promise<string> {
  const config = await getOssConfig();
  return `${buildHost(config.bucket, config.endpoint)}/${key}`;
}

async function buildOssClient(): Promise<{ client: OSS; config: OssConfig }> {
  const config = await getOssConfig();
  const endpoint = config.endpoint.startsWith("http")
    ? config.endpoint
    : `https://${config.endpoint}`;
  const client = new OSS({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    bucket: config.bucket,
    endpoint,
    secure: true,
  });
  return { client, config };
}

export async function uploadBuffer(
  key: string,
  buffer: Buffer,
  contentType?: string
): Promise<string> {
  const { client, config } = await buildOssClient();
  await client.put(
    key,
    buffer,
    contentType ? { mime: contentType } : undefined
  );
  return `${buildHost(config.bucket, config.endpoint)}/${key}`;
}

export function extractOssKey(url: string, bucket: string): string | null {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\//, "");
    if (u.host.startsWith(`${bucket}.`)) {
      return path || null;
    }
    if (path.startsWith(`${bucket}/`)) {
      return path.slice(bucket.length + 1) || null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function deleteObjectByUrl(url: string): Promise<void> {
  const { client, config } = await buildOssClient();
  const key = extractOssKey(url, config.bucket);
  if (!key) {
    throw new Error(`unable to extract OSS key from URL: ${url}`);
  }
  await client.delete(key);
}
