import { NextRequest, NextResponse } from "next/server";
import { isUnauthorized, requireAdminSession } from "@/lib/adminAuth";
import { createUser, listUsers } from "@/lib/adminUsers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (isUnauthorized(auth)) return auth;
  const users = await listUsers();
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (isUnauthorized(auth)) return auth;
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const username = (body?.username ?? "").trim();
  const password = body?.password ?? "";
  try {
    await createUser(username, password);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
