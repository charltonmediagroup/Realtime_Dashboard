import { NextResponse } from "next/server";
import { buildClearCookie } from "@/lib/adminSession";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", buildClearCookie());
  return res;
}
