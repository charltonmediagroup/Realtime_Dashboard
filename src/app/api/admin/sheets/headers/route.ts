import { NextRequest, NextResponse } from "next/server";
import { isUnauthorized, requireAdminSession } from "@/lib/adminAuth";
import { getSheetsClient } from "@/lib/googleOAuth";
import { extractSpreadsheetId } from "@/lib/savedReferences";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (isUnauthorized(auth)) return auth;

  const idOrUrl = req.nextUrl.searchParams.get("id") ?? "";
  const tab = req.nextUrl.searchParams.get("tab") ?? "";
  const id = extractSpreadsheetId(idOrUrl);
  if (!id || !tab) {
    return NextResponse.json({ error: "id and tab required" }, { status: 400 });
  }
  try {
    const sheets = getSheetsClient();
    const range = `'${tab.replace(/'/g, "''")}'!1:1`;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range,
    });
    const headers = (res.data.values?.[0] ?? []).map((v) => String(v ?? "").trim());
    return NextResponse.json({ headers });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Sheets API error" },
      { status: 500 },
    );
  }
}
