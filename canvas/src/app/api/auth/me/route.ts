import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/c-auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: true, data: null });
  }
  return NextResponse.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      balance: user.balance,
      emailVerified: user.emailVerified,
      status: user.status,
    },
  });
}
