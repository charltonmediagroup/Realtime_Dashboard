import { NextRequest, NextResponse } from "next/server";
import { isUnauthorized, requireAdminSession } from "@/lib/adminAuth";
import { getCollection } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string }> },
) {
  const auth = await requireAdminSession(req);
  if (isUnauthorized(auth)) return auth;
  const { collection } = await params;
  const col = await getCollection(collection);
  const uids = (await col.distinct("uid")) as unknown[];
  const list = uids
    .filter((u): u is string => typeof u === "string")
    .sort((a, b) => a.localeCompare(b));
  return NextResponse.json({ uids: list });
}
