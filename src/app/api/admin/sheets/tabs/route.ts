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
  const id = extractSpreadsheetId(idOrUrl);
  if (!id) {
    return NextResponse.json({ error: "Invalid sheet id or URL" }, { status: 400 });
  }
  try {
    const sheets = getSheetsClient();
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: id,
      fields: "spreadsheetId,properties.title,sheets(properties(sheetId,title,index))",
    });
    const tabs = (meta.data.sheets ?? [])
      .map((s) => ({
        sheetId: s.properties?.sheetId ?? null,
        title: s.properties?.title ?? "",
        index: s.properties?.index ?? 0,
      }))
      .filter((t) => t.title)
      .sort((a, b) => a.index - b.index);
    return NextResponse.json({
      spreadsheetId: id,
      title: meta.data.properties?.title ?? "",
      tabs,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Sheets API error" },
      { status: 500 },
    );
  }
}
