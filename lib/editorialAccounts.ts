import { getCollection } from "@/lib/db";

const COLLECTION = "dashboard-config";
const DOC_UID = "editorial-roster";
const TTL_MS = 24 * 60 * 60 * 1000;

export type EditorialAccount = {
  name: string;
  role: string;
  username: string;
};

let cache: { fetchedAt: number; rows: EditorialAccount[] } | null = null;

export async function getEditorialAccounts(force = false): Promise<EditorialAccount[]> {
  if (!force && cache && Date.now() - cache.fetchedAt < TTL_MS) {
    return cache.rows;
  }

  const col = await getCollection<{ uid: string; data: EditorialAccount[] }>(COLLECTION);
  const doc = await col.findOne({ uid: DOC_UID });
  const raw = Array.isArray(doc?.data) ? doc.data : [];

  // Normalize and drop any rows missing required fields.
  const rows: EditorialAccount[] = raw
    .map((r) => ({
      name: (r?.name ?? "").trim(),
      role: (r?.role ?? "").trim(),
      username: (r?.username ?? "").trim(),
    }))
    .filter((r) => r.username || r.name);

  cache = { fetchedAt: Date.now(), rows };
  return rows;
}

// Normalize a Drupal display_name or roster username for matching.
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
