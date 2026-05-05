import { NextRequest, NextResponse } from "next/server";
import { findByUsername, touchLastLogin, verifyPassword } from "@/lib/adminUsers";
import { buildSetCookie, createSessionToken } from "@/lib/adminSession";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const username = (body?.username ?? "").trim();
  const password = body?.password ?? "";
  if (!username || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const user = await findByUsername(username);
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const ok = await verifyPassword(user, password);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await touchLastLogin(username).catch(() => {});

  const { token, expiresAt } = await createSessionToken(username);
  const res = NextResponse.json({ ok: true, username });
  res.headers.append("Set-Cookie", buildSetCookie(token, expiresAt));
  return res;
}
