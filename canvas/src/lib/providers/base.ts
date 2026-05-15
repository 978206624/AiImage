export type ProviderType = "openai" | "google";
export type EndpointType = "openai_images" | "gemini_generate_content";
export type BillingType = "metered" | "per_request";

export interface SubmitParams {
  prompt: string;
  size: string;
  quality?: string;
  referenceImages?: string[];
  userId?: number;
}

export interface ImageData {
  b64_json?: string;
  mimeType: string;
  data: string;
}

export interface SubmitResult {
  async: false;
  imageData: ImageData;
  raw?: unknown;
}

export interface QueryResult {
  status: "processing" | "completed" | "failed";
  progress?: number;
  imageData?: ImageData;
  imageUrl?: string;
  failReason?: string;
}

export interface ImageProvider {
  readonly provider: ProviderType;
  readonly modelId: string;
  readonly endpointType: EndpointType;

  submitTask(params: SubmitParams): Promise<SubmitResult>;
  queryTask?(taskId: string): Promise<QueryResult>;
}

export interface ModelConfig {
  id: number;
  displayName: string;
  provider: ProviderType;
  modelId: string;
  endpointType: EndpointType;
  billingType: BillingType;
  platformCost: string | null;
  userCreditCost: string;
  enabled: boolean;
  userSelectable: boolean;
  sortOrder: number;
  concurrencyLimit: number;
  timeoutSeconds: number;
}
