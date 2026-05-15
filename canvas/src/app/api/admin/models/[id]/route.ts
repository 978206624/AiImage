import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

async function requireAdmin() {
  const session = await verifySession();
  if (!session || session.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const modelId = parseInt(id);

  if (Number.isNaN(modelId)) {
    return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
  }

  const model = await prisma.modelConfig.findUnique({
    where: { id: modelId },
  });

  if (!model) {
    return NextResponse.json({ success: false, error: "Model not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: { model } });
}

interface UpdateBody {
  displayName?: string;
  provider?: string;
  modelId?: string;
  endpointType?: string;
  billingType?: string;
  platformCost?: number | null;
  userCreditCost?: number;
  enabled?: boolean;
  userSelectable?: boolean;
  sortOrder?: number;
  concurrencyLimit?: number;
  timeoutSeconds?: number;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const modelId = parseInt(id);

  if (Number.isNaN(modelId)) {
    return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
  }

  let body: UpdateBody;
  try {
    body = (await request.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  if (body.displayName !== undefined) updateData.displayName = body.displayName;
  if (body.provider !== undefined) {
    const validProviders = ["openai", "google"];
    if (!validProviders.includes(body.provider)) {
      return NextResponse.json({ success: false, error: "Invalid provider" }, { status: 400 });
    }
    updateData.provider = body.provider;
  }
  if (body.modelId !== undefined) updateData.modelId = body.modelId;
  if (body.endpointType !== undefined) {
    const validEndpointTypes = ["openai_images", "gemini_generate_content"];
    if (!validEndpointTypes.includes(body.endpointType)) {
      return NextResponse.json({ success: false, error: "Invalid endpoint type" }, { status: 400 });
    }
    updateData.endpointType = body.endpointType;
  }
  if (body.billingType !== undefined) {
    const validBillingTypes = ["metered", "per_request"];
    if (!validBillingTypes.includes(body.billingType)) {
      return NextResponse.json({ success: false, error: "Invalid billing type" }, { status: 400 });
    }
    updateData.billingType = body.billingType;
  }
  if (body.platformCost !== undefined) {
    updateData.platformCost = body.platformCost !== null ? String(body.platformCost) : null;
  }
  if (body.userCreditCost !== undefined) updateData.userCreditCost = String(body.userCreditCost);
  if (body.enabled !== undefined) updateData.enabled = body.enabled;
  if (body.userSelectable !== undefined) updateData.userSelectable = body.userSelectable;
  if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
  if (body.concurrencyLimit !== undefined) updateData.concurrencyLimit = body.concurrencyLimit;
  if (body.timeoutSeconds !== undefined) updateData.timeoutSeconds = body.timeoutSeconds;

  try {
    const model = await prisma.modelConfig.update({
      where: { id: modelId },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: { model } });
  } catch (err) {
    console.error("Failed to update model config:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update model config" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const modelId = parseInt(id);

  if (Number.isNaN(modelId)) {
    return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
  }

  try {
    await prisma.modelConfig.delete({
      where: { id: modelId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete model config:", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete model config" },
      { status: 500 }
    );
  }
}
