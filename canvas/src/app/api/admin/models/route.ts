import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

async function requireAdmin() {
  const session = await verifySession();
  if (!session || session.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const models = await prisma.modelConfig.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    success: true,
    data: { models },
  });
}

interface CreateBody {
  displayName: string;
  provider: string;
  modelId: string;
  endpointType: string;
  billingType: string;
  platformCost?: number;
  userCreditCost: number;
  enabled?: boolean;
  userSelectable?: boolean;
  sortOrder?: number;
  concurrencyLimit?: number;
  timeoutSeconds?: number;
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const {
    displayName,
    provider,
    modelId,
    endpointType,
    billingType,
    platformCost,
    userCreditCost,
    enabled = true,
    userSelectable = true,
    sortOrder = 0,
    concurrencyLimit = 3,
    timeoutSeconds = 120,
  } = body;

  if (!displayName || !provider || !modelId || !endpointType || !billingType || !userCreditCost) {
    return NextResponse.json(
      { success: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  const validProviders = ["openai", "google"];
  if (!validProviders.includes(provider)) {
    return NextResponse.json(
      { success: false, error: "Invalid provider" },
      { status: 400 }
    );
  }

  const validEndpointTypes = ["openai_images", "gemini_generate_content"];
  if (!validEndpointTypes.includes(endpointType)) {
    return NextResponse.json(
      { success: false, error: "Invalid endpoint type" },
      { status: 400 }
    );
  }

  const validBillingTypes = ["metered", "per_request"];
  if (!validBillingTypes.includes(billingType)) {
    return NextResponse.json(
      { success: false, error: "Invalid billing type" },
      { status: 400 }
    );
  }

  try {
    const model = await prisma.modelConfig.create({
      data: {
        displayName,
        provider,
        modelId,
        endpointType,
        billingType,
        platformCost: platformCost ? String(platformCost) : null,
        userCreditCost: String(userCreditCost),
        enabled,
        userSelectable,
        sortOrder,
        concurrencyLimit,
        timeoutSeconds,
      },
    });

    return NextResponse.json({ success: true, data: { model } });
  } catch (err) {
    console.error("Failed to create model config:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create model config" },
      { status: 500 }
    );
  }
}
