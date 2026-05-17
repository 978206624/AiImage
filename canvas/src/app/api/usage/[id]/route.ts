import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/c-auth";
import { deleteObjectByUrl } from "@/lib/oss";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: e.message, code: e.code },
        { status: e.statusCode }
      );
    }
    throw e;
  }

  const { id } = await params;
  const recordId = parseInt(id, 10);
  if (!Number.isFinite(recordId)) {
    return NextResponse.json(
      { success: false, error: "无效 ID" },
      { status: 400 }
    );
  }

  const record = await prisma.usageRecord.findFirst({
    where: { id: recordId, userId: user.id },
    select: { id: true, imageUrl: true, isPersisted: true },
  });

  if (!record) {
    return NextResponse.json(
      { success: false, error: "记录不存在" },
      { status: 404 }
    );
  }

  const result = await prisma.usageRecord.deleteMany({
    where: { id: record.id, userId: user.id },
  });

  if (result.count > 0 && record.isPersisted && record.imageUrl) {
    try {
      await deleteObjectByUrl(record.imageUrl);
    } catch (err) {
      console.error("[usage delete] OSS cleanup failed:", {
        id: record.id,
        url: record.imageUrl,
        error: err instanceof Error ? err.message : err,
      });
    }
  }

  return NextResponse.json({ success: true });
}
