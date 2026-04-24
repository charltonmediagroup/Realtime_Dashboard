import { NextResponse } from "next/server";
import { getSheetsClient } from "@/lib/googleOAuth";

export const dynamic = "force-dynamic";

const SHEET_ID = "1XaCvMWBcCgAsDByoWJE-ru3fv0K23U7rxI87_vFNWcE";
const TAB_NAME = "Awards Leaderboard";
const RANGE_SUFFIX = "!A1:E2000";

type Entry = {
  name: string;
  total: number;
  deals: number;
  topAward: string;
};

type Payload = {
  entries: Entry[];
  grandTotal: number;
  lastUpdated: string;
};

function parseCurrency(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const cleaned = s.replace(/[$,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizePIC(raw: unknown): string {
  let s = String(raw ?? "").trim();
  if (!s) return "";
  const co = s.match(/\bc\/o\s+(.+)$/i);
  if (co) s = co[1].trim();
  s = s.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const sepIdx = s.search(/\s*[-,/]/);
  if (sepIdx > 0) s = s.slice(0, sepIdx).trim();
  s = s.replace(/\s+(website\s+lead|web\s+lead|li\s+leads?|campaign\s+lead|past\s+winner)$/i, "").trim();
  s = s.replace(/\s+(LI|Li|PW|Leads?|Campaign|Website|Incoming|50%)$/i, "").trim();
  return s;
}

type Agg = {
  displayName: string;
  total: number;
  deals: number;
  awardTotals: Record<string, number>;
  awardFirstSeen: Record<string, number>;
};

export async function GET() {
  try {
    const sheets = getSheetsClient();
    const range = `'${TAB_NAME.replace(/'/g, "''")}'${RANGE_SUFFIX}`;

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range,
      valueRenderOption: "UNFORMATTED_VALUE",
    });

    const rows = res.data.values ?? [];
    if (rows.length < 2) {
      return NextResponse.json({ error: "Empty sheet" }, { status: 500 });
    }

    const byPIC: Record<string, Agg> = {};
    let awardSeq = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const awardName = String(row[0] ?? "").trim();
      const picRaw = row[1];
      const usd = parseCurrency(row[4]);

      const display = normalizePIC(picRaw);
      if (!display) continue;
      if (usd == null || usd <= 0) continue;
      if (!awardName) continue;

      const key = display.toLowerCase();
      let agg = byPIC[key];
      if (!agg) {
        agg = {
          displayName: display,
          total: 0,
          deals: 0,
          awardTotals: {},
          awardFirstSeen: {},
        };
        byPIC[key] = agg;
      }

      agg.total += usd;
      agg.deals += 1;
      agg.awardTotals[awardName] = (agg.awardTotals[awardName] ?? 0) + usd;
      if (agg.awardFirstSeen[awardName] === undefined) {
        agg.awardFirstSeen[awardName] = awardSeq++;
      }
    }

    const entries: Entry[] = Object.values(byPIC)
      .map((agg) => {
        let topAward = "";
        let topValue = -Infinity;
        let topSeen = Infinity;
        for (const [award, value] of Object.entries(agg.awardTotals)) {
          const seen = agg.awardFirstSeen[award] ?? Infinity;
          if (value > topValue || (value === topValue && seen < topSeen)) {
            topAward = award;
            topValue = value;
            topSeen = seen;
          }
        }
        return {
          name: agg.displayName,
          total: agg.total,
          deals: agg.deals,
          topAward,
        };
      })
      .filter((e) => e.total > 0)
      .sort((a, b) => b.total - a.total);

    const grandTotal = entries.reduce((sum, e) => sum + e.total, 0);

    const payload: Payload = {
      entries,
      grandTotal,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("API /awards/leaderboard failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
