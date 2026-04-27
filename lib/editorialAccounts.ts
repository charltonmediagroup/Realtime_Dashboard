import { google } from "googleapis";

const SHEET_ID = "1WHpO9lj3GQd144_hP_DgB7i83BdVomAFbuCf5P19pn4";
const RANGE = "Drupal 10 Accounts!A:C";
const TTL_MS = 24 * 60 * 60 * 1000;

export type EditorialAccount = {
  name: string;
  role: string;
  username: string;
};

let cache: { fetchedAt: number; rows: EditorialAccount[] } | null = null;

function buildAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON env var not set");
  const creds = JSON.parse(raw);
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

export async function getEditorialAccounts(force = false): Promise<EditorialAccount[]> {
  if (!force && cache && Date.now() - cache.fetchedAt < TTL_MS) {
    return cache.rows;
  }

  const auth = buildAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: RANGE,
  });

  const values = (resp.data.values ?? []) as string[][];
  const rows = parseEditorialSection(values);
  cache = { fetchedAt: Date.now(), rows };
  return rows;
}

const EDITORIAL_SECTION = "editorial team";

// The sheet groups people into sections via header rows (col A has text,
// cols B and C are empty). We walk in order, track the current section,
// and only collect data rows under "EDITORIAL TEAM". This avoids both the
// admins above the section and the COMMERCIAL section below (which confusingly
// uses role "Editor" for non-editorial people).
function parseEditorialSection(values: string[][]): EditorialAccount[] {
  const out: EditorialAccount[] = [];
  let inEditorial = false;

  for (const r of values) {
    const a = (r[0] ?? "").trim();
    const b = (r[1] ?? "").trim();
    const c = (r[2] ?? "").trim();

    const isHeaderLabel = a && !b && !c;
    if (isHeaderLabel) {
      inEditorial = a.toLowerCase() === EDITORIAL_SECTION;
      continue;
    }

    // Skip column-header row and any blank rows.
    if (!a && !b && !c) continue;
    if (a.toLowerCase() === "employee name") continue;

    if (inEditorial && c) {
      out.push({ name: a, role: b, username: c });
    }
  }
  return out;
}

// Normalize a Drupal display_name or sheet username for matching.
// Strips whitespace, lowercases, removes @charltonmediamail.com / @gmail.com etc.,
// and converts separators (_ . - space) into a single canonical form.
export function normalizeKey(raw: string): string {
  if (!raw) return "";
  const lower = raw.trim().toLowerCase();
  const local = lower.includes("@") ? lower.split("@")[0] : lower;
  return local.replace(/[\s._-]+/g, "");
}

export function buildEditorialKeySet(accounts: EditorialAccount[]): Set<string> {
  const keys = new Set<string>();
  for (const a of accounts) {
    if (a.username) keys.add(normalizeKey(a.username));
    if (a.name) keys.add(normalizeKey(a.name));
  }
  return keys;
}

export function isEditorialAuthor(authorName: string, keys: Set<string>): boolean {
  return keys.has(normalizeKey(authorName));
}

// Index keyed by both normalized name and normalized username so any of the
// variants Drupal might surface for one person ("Sam Bernardo", "Samantha",
// "samantha@charltonmediamail.com") all resolve back to the same EditorialAccount.
// First names are intentionally NOT indexed — too ambiguous (e.g. "Sam" could be
// Sam Atok or Sam Bernardo).
export type EditorialIndex = { byKey: Map<string, EditorialAccount> };

export function buildEditorialIndex(accounts: EditorialAccount[]): EditorialIndex {
  const byKey = new Map<string, EditorialAccount>();
  for (const a of accounts) {
    const nk = normalizeKey(a.name);
    if (nk && !byKey.has(nk)) byKey.set(nk, a);
    const uk = normalizeKey(a.username);
    if (uk && !byKey.has(uk)) byKey.set(uk, a);
  }
  return { byKey };
}

export function resolveAuthor(
  authorName: string,
  idx: EditorialIndex,
): EditorialAccount | null {
  const k = normalizeKey(authorName);
  if (!k) return null;
  return idx.byKey.get(k) ?? null;
}
