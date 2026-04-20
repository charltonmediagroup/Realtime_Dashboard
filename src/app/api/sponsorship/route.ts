import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleOAuth";

export const dynamic = "force-dynamic";

const SHEET_ID = "1QgONEKtOeeE12ts5maQlMfAlnee1qxi7O-E8zhtJjxY";
const SHEET_GID = 124466268;
const RANGE_SUFFIX = "!A1:J40";

type Cell = number | string | null;

type Week = {
  week: string;
  values: Record<string, Cell>;
  weeklyTotal: number;
  monthlyTotal: number | null;
};

type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

type Payload = {
  salespeople: string[];
  weeks: Week[];
  totals: Record<string, number>;
  grandTotal: number;
  currentQuarter: Quarter;
  quarterTotals: Record<string, number>;
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

function currentQuarter(d = new Date()): Quarter {
  const m = d.getMonth(); // 0-11
  if (m <= 2) return "Q1";
  if (m <= 5) return "Q2";
  if (m <= 8) return "Q3";
  return "Q4";
}

const QUARTER_LABELS: Record<Quarter, RegExp> = {
  Q1: /^1st\s*quarter$/i,
  Q2: /^2nd\s*quarter$/i,
  Q3: /^3rd\s*quarter$/i,
  Q4: /^4th\s*quarter$/i,
};

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
    const quarterTotals: Record<string, number> = Object.fromEntries(salespeople.map((n) => [n, 0]));
    const weeks: Week[] = [];

    const nowQuarter = currentQuarter();
    const quarterRegex = QUARTER_LABELS[nowQuarter];

    // Row indexes already consumed as quarterly/section headers we should skip when recording weeks
    const isQuarterRow = (label: string) =>
      Object.values(QUARTER_LABELS).some((re) => re.test(label));

    // Detect weekly section ends when we hit empty or "IN USD"/quarterly header region
    let inWeeklySection = true;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const label = String(row[0] ?? "").trim();

      // Quarter row match — record per-person totals for current quarter
      if (quarterRegex.test(label)) {
        salespeople.forEach((name, idx) => {
          const cell = parseCurrency(row[1 + idx]);
          if (typeof cell === "number") quarterTotals[name] += cell;
        });
        inWeeklySection = false;
        continue;
      }

      if (isQuarterRow(label)) {
        inWeeklySection = false;
        continue;
      }

      if (!inWeeklySection) continue;
      if (!label) continue;

      // Weekly row
      const values: Record<string, Cell> = {};
      salespeople.forEach((name, idx) => {
        const cell = parseCurrency(row[1 + idx]);
        values[name] = cell;
        if (typeof cell === "number") totals[name] += cell;
      });

      const weeklyRaw = totalIdx >= 0 ? parseCurrency(row[totalIdx]) : null;
      const monthlyRaw = monthlyIdx >= 0 ? parseCurrency(row[monthlyIdx]) : null;

      weeks.push({
        week: label,
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
      currentQuarter: nowQuarter,
      quarterTotals,
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
