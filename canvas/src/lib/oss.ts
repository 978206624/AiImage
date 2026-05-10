import crypto from "crypto";

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

function getOssConfig(): OssConfig {
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
  const bucket = process.env.OSS_BUCKET;
  const region = process.env.OSS_REGION;
  const endpoint = process.env.OSS_ENDPOINT;

  if (!accessKeyId || !accessKeySecret || !bucket || !region || !endpoint) {
    throw new Error("OSS 配置不完整，请在系统设置中配置 OSS 参数");
  }

  return { accessKeyId, accessKeySecret, bucket, region, endpoint };
}

export function generateUploadCredentials(
  dir: string,
  filename: string
): UploadCredentials {
  const config = getOssConfig();

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

  const host = config.endpoint.startsWith("http")
    ? `${config.endpoint}/${config.bucket}`
    : `https://${config.bucket}.${config.endpoint}`;

  return {
    host,
    key,
    policy: policyBase64,
    signature,
    OSSAccessKeyId: config.accessKeyId,
    successActionStatus: "200",
  };
}

export function getPublicUrl(key: string): string {
  const config = getOssConfig();
  const host = config.endpoint.startsWith("http")
    ? `${config.endpoint}/${config.bucket}`
    : `https://${config.bucket}.${config.endpoint}`;
  return `${host}/${key}`;
}
