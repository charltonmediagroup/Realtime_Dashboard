import { NextRequest, NextResponse } from "next/server";
import { isUnauthorized, requireAdminSession } from "@/lib/adminAuth";
import {
  countUsers,
  deleteUser,
  findByUsername,
  updatePassword,
} from "@/lib/adminUsers";

export const runtime = "nodejs";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const auth = await requireAdminSession(req);
  if (isUnauthorized(auth)) return auth;
  const { username } = await params;
  const target = decodeURIComponent(username);
  const existing = await findByUsername(target);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    await updatePassword(target, body?.password ?? "");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const auth = await requireAdminSession(req);
  if (isUnauthorized(auth)) return auth;
  const { username } = await params;
  const target = decodeURIComponent(username);

  if (auth.username === target) {
    return NextResponse.json(
      { error: "Cannot delete the currently signed-in user" },
      { status: 400 },
    );
  }
  const total = await countUsers();
  if (total <= 1) {
    return NextResponse.json(
      { error: "Cannot delete the last admin" },
      { status: 400 },
    );
  }
  const result = await deleteUser(target);
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
