import { NextRequest, NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleOAuth";
import { getSavedReference } from "@/lib/savedReferences";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ROWS = 5000;

// Public read endpoint for *published* saved references. Only serves data for
// references the admin has explicitly toggled published — this prevents the
// public API from being used to fetch arbitrary Google Sheets.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ref = await getSavedReference(id);
  if (!ref || !ref.published) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const sheets = getSheetsClient();
    const range = `'${ref.tabName.replace(/'/g, "''")}'`;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: ref.spreadsheetId,
      range,
      valueRenderOption: "FORMATTED_VALUE",
    });
    const rows = res.data.values ?? [];
    const headers = (rows[0] ?? []).map((v) => String(v ?? "").trim());
    const data = rows.slice(1, 1 + MAX_ROWS).map((row) =>
      headers.map((_, ci) => {
        const cell = row[ci];
        return cell == null ? "" : String(cell);
      }),
    );
    return NextResponse.json({
      headers,
      rows: data,
      truncated: rows.length - 1 > MAX_ROWS,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Sheets API error" },
      { status: 500 },
    );
  }
}
