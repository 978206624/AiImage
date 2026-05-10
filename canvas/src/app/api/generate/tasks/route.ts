import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/c-auth";

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId");
  if (!groupId) {
    return NextResponse.json(
      { success: false, error: "缺少 groupId" },
      { status: 400 }
    );
  }

  const tasks = await prisma.imageTask.findMany({
    where: { groupId, userId: user.id },
    orderBy: { id: "asc" },
    select: {
      id: true,
      status: true,
      progress: true,
      imageUrl: true,
      isPersisted: true,
      failReason: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    tasks: tasks.map((t) => ({
      id: t.id,
      status: t.status,
      progress: t.progress,
      imageUrl: t.imageUrl,
      isPersisted: t.isPersisted,
      failReason: t.failReason,
      createdAt: t.createdAt,
    })),
  });
}
