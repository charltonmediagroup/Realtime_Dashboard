import { NextRequest, NextResponse } from "next/server";
import { isUnauthorized, requireAdminSession } from "@/lib/adminAuth";
import { getAdapter } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (isUnauthorized(auth)) return auth;
  const adapter = await getAdapter();
  const names = await adapter.listCollectionNames();
  return NextResponse.json({ collections: names });
}
