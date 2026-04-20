import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleOAuth";

export const dynamic = "force-dynamic";

const SHEET_ID = "1QgONEKtOeeE12ts5maQlMfAlnee1qxi7O-E8zhtJjxY";
const SHEET_GID = 124466268;
const RANGE_SUFFIX = "!A1:J21";

type Cell = number | string | null;

type Week = {
  week: string;
  values: Record<string, Cell>;
  weeklyTotal: number;
  monthlyTotal: number | null;
};

type Payload = {
  salespeople: string[];
  weeks: Week[];
  totals: Record<string, number>;
  grandTotal: number;
  lastUpdated: string;
};

function parseCurrency(raw: unknown): Cell {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const cleaned = s.replace(/[$,\s]/g, "");
  const n = Number(cleaned);
  if (Number.isFinite(n)) return n;
  return s.toUpperCase();
}

async function resolveTabName(sheets: ReturnType<typeof getSheetsClient>): Promise<string> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID, fields: "sheets(properties(sheetId,title))" });
  const found = meta.data.sheets?.find((s) => s.properties?.sheetId === SHEET_GID);
  if (!found?.properties?.title) throw new Error(`Sheet tab with gid=${SHEET_GID} not found`);
  return found.properties.title;
}

export async function GET() {
  try {
    const sheets = getSheetsClient();
    const tabName = await resolveTabName(sheets);
    const range = `'${tabName.replace(/'/g, "''")}'${RANGE_SUFFIX}`;

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range,
      valueRenderOption: "UNFORMATTED_VALUE",
    });

    const rows = res.data.values ?? [];
    if (rows.length === 0) {
      return NextResponse.json({ error: "Empty sheet" }, { status: 500 });
    }

    const header = rows[0].map((c) => String(c ?? "").trim());
    const totalIdx = header.findIndex((h) => h.toUpperCase() === "TOTAL");
    const monthlyIdx = header.findIndex((h) => h.toUpperCase().includes("MONTHLY"));
    const salespeople = header
      .slice(1, totalIdx === -1 ? header.length : totalIdx)
      .filter((n) => n.length > 0);

    const totals: Record<string, number> = Object.fromEntries(salespeople.map((n) => [n, 0]));
    const weeks: Week[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const week = String(row[0] ?? "").trim();
      if (!week) continue;

      const values: Record<string, Cell> = {};
      salespeople.forEach((name, idx) => {
        const cell = parseCurrency(row[1 + idx]);
        values[name] = cell;
        if (typeof cell === "number") totals[name] += cell;
      });

      const weeklyRaw = totalIdx >= 0 ? parseCurrency(row[totalIdx]) : null;
      const monthlyRaw = monthlyIdx >= 0 ? parseCurrency(row[monthlyIdx]) : null;

      weeks.push({
        week,
        values,
        weeklyTotal: typeof weeklyRaw === "number" ? weeklyRaw : 0,
        monthlyTotal: typeof monthlyRaw === "number" ? monthlyRaw : null,
      });
    }

    const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

    const payload: Payload = {
      salespeople,
      weeks,
      totals,
      grandTotal,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("API /sponsorship failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
