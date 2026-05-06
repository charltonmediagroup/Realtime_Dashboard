import "server-only";
import {
  LEAD_SOURCE_BUCKETS,
  type AudienceMovement,
  type LeadSourceBucket,
  type LeadSourceMovement,
  type MailchimpAudienceStats,
} from "./mailchimpTypes";

// Re-export shared types so existing call sites that import them from this
// module keep working.
export {
  LEAD_SOURCE_BUCKETS,
  type AudienceMovement,
  type LeadSourceBucket,
  type LeadSourceMovement,
  type MailchimpAudienceStats,
} from "./mailchimpTypes";

// Process-local TTL cache so we don't hammer Mailchimp's Akamai edge on every
// page load. Mailchimp returns 503s under sustained burst — a short cache
// window means most requests serve from memory instead of refetching.
const AUDIENCES_TTL_MS = 5 * 60 * 1000;
const MOVEMENT_TTL_MS = 10 * 60 * 1000;
type CacheEntry<T> = { value: T; expiresAt: number };
// Persist on globalThis so the cache survives dev-mode module reloads
// (Turbopack re-instantiates modules between requests, wiping module-local
// state). In production this is just a regular module-level Map.
type GlobalWithMcCache = typeof globalThis & {
  __mcCache?: Map<string, CacheEntry<unknown>>;
  __mcInflight?: Map<string, Promise<unknown>>;
};
const g = globalThis as GlobalWithMcCache;
const cache = (g.__mcCache ??= new Map<string, CacheEntry<unknown>>());
const inflight = (g.__mcInflight ??= new Map<string, Promise<unknown>>());

async function getCached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > now) return hit.value;
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = (async () => {
    try {
      const value = await loader();
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

export type MailchimpAccountConfig = {
  apiKey: string;
  server: string;
  listId: string;
};

type ListResponse = {
  id: string;
  name?: string;
  stats?: {
    member_count?: number;
    unsubscribe_count?: number;
    cleaned_count?: number;
    total_contacts?: number;
    open_rate?: number;
    click_rate?: number;
  };
};

type MemberMergeFields = { MMERGE9?: string };
type MembersResponse = {
  members: { merge_fields?: MemberMergeFields }[];
  total_items: number;
};

function parseAccounts(): Record<string, MailchimpAccountConfig> {
  const raw = process.env.MAILCHIMP_ACCOUNTS_JSON;
  if (!raw) throw new Error("MAILCHIMP_ACCOUNTS_JSON env var not set.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`MAILCHIMP_ACCOUNTS_JSON is not valid JSON: ${(e as Error).message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("MAILCHIMP_ACCOUNTS_JSON must be an object keyed by account title.");
  }
  const out: Record<string, MailchimpAccountConfig> = {};
  for (const [title, value] of Object.entries(parsed as Record<string, unknown>)) {
    const v = value as Partial<MailchimpAccountConfig>;
    if (!v?.apiKey || !v?.server || !v?.listId) {
      throw new Error(`MAILCHIMP_ACCOUNTS_JSON["${title}"] is missing apiKey/server/listId.`);
    }
    out[title] = { apiKey: v.apiKey, server: v.server, listId: v.listId };
  }
  return out;
}

function authHeader(apiKey: string): string {
  return "Basic " + Buffer.from(`any:${apiKey}`).toString("base64");
}

// Mailchimp sits behind Akamai, which 503s short bursts. Retry with
// exponential backoff up to 3 times before surfacing the error.
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastRes: Response | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      const delay = 600 * 2 ** (attempt - 1) + Math.random() * 400;
      await new Promise((r) => setTimeout(r, delay));
    }
    const res = await fetch(url, init);
    if (res.status !== 503) return res;
    lastRes = res;
  }
  return lastRes!;
}

// Cap parallel Mailchimp calls so Akamai doesn't rate-limit us. The cold-load
// burst (audiences × 1 + per-audience movement × 3) easily breaches their edge
// limit when run flat-out.
async function mapWithConcurrency<T, U>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<U>,
): Promise<U[]> {
  const out: U[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

// Some MMERGE9 values are CSV-style concats (e.g. "Awards page sign-up, Awards page sign-up").
// Pick the first non-empty token.
function primaryToken(raw: string | undefined): string {
  if (!raw) return "";
  for (const part of raw.split(",")) {
    const t = part.trim();
    if (t) return t;
  }
  return "";
}

export function classifyLeadSource(rawValue: string | undefined): LeadSourceBucket {
  const v = primaryToken(rawValue).toLowerCase();
  if (!v) return "Other";
  if (/newsletter\s*sign[-\s]?up/.test(v)) return "Newsletter sign-up";
  if (/^bizcon\b|\brsvp\b|\bevent\b|\bedm\b/.test(v)) return "Events";
  if (/awards/.test(v)) return "Awards";
  if (/moody|s&p|standard\s*&\s*poor|fortune|forbes|biz\s*cards?|top\s*\d|apac\s+banks?|apac\s+nbfi/.test(v))
    return "Top banks / companies";
  if (/facebook\s*ads?|linkedin\s*ads?|google\s*ads?|paid\s*social|paid\s*search|gads/.test(v)) return "Paid Ads";
  return "Other";
}

function emptyBuckets(): Record<LeadSourceBucket, LeadSourceMovement> {
  const out = {} as Record<LeadSourceBucket, LeadSourceMovement>;
  for (const b of LEAD_SOURCE_BUCKETS) {
    out[b] = { bucket: b, subscribed: 0, unsubscribed: 0, cleaned: 0 };
  }
  return out;
}

async function fetchOneStats(
  title: string,
  account: MailchimpAccountConfig,
): Promise<MailchimpAudienceStats> {
  const url =
    `https://${account.server}.api.mailchimp.com/3.0/lists/${account.listId}` +
    `?fields=id,name,stats.member_count,stats.unsubscribe_count,stats.cleaned_count,` +
    `stats.total_contacts,stats.open_rate,stats.click_rate`;

  const empty: MailchimpAudienceStats = {
    title,
    listId: account.listId,
    server: account.server,
    listName: null,
    memberCount: 0,
    unsubscribeCount: 0,
    cleanedCount: 0,
    totalContacts: 0,
    openRate: null,
    clickRate: null,
    unsubscribeRate: null,
    error: null,
  };

  try {
    const res = await fetchWithRetry(url, {
      headers: { Authorization: authHeader(account.apiKey), Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ...empty, error: `HTTP ${res.status}${text ? `: ${text.slice(0, 120)}` : ""}` };
    }
    const data = (await res.json()) as ListResponse;
    const members = data.stats?.member_count ?? 0;
    const unsubs = data.stats?.unsubscribe_count ?? 0;
    const denom = members + unsubs;
    return {
      ...empty,
      listName: data.name ?? null,
      memberCount: members,
      unsubscribeCount: unsubs,
      cleanedCount: data.stats?.cleaned_count ?? 0,
      totalContacts: data.stats?.total_contacts ?? 0,
      openRate: typeof data.stats?.open_rate === "number" ? data.stats.open_rate : null,
      clickRate: typeof data.stats?.click_rate === "number" ? data.stats.click_rate : null,
      unsubscribeRate: denom > 0 ? (unsubs / denom) * 100 : null,
    };
  } catch (e) {
    return { ...empty, error: e instanceof Error ? e.message : String(e) };
  }
}

async function fetchOneStatsCached(
  title: string,
  account: MailchimpAccountConfig,
): Promise<MailchimpAudienceStats> {
  const key = `stats:${account.server}:${account.listId}`;
  const result = await getCached(key, AUDIENCES_TTL_MS, () => fetchOneStats(title, account));
  // Don't cache failures — let the next load retry them. Drop the entry so a
  // later request will re-fetch instead of serving the stale error.
  if (result.error) cache.delete(key);
  return result;
}

export async function fetchAllAudiences(): Promise<MailchimpAudienceStats[]> {
  const accounts = parseAccounts();
  const entries = Object.entries(accounts);
  const rows = await mapWithConcurrency(entries, 6, ([title, cfg]) =>
    fetchOneStatsCached(title, cfg),
  );
  rows.sort((a, b) => {
    if (a.error && !b.error) return 1;
    if (!a.error && b.error) return -1;
    return b.memberCount - a.memberCount;
  });
  return rows;
}

async function fetchMembersByStatus(
  account: MailchimpAccountConfig,
  status: "subscribed" | "unsubscribed" | "cleaned",
  sinceIso: string,
): Promise<{ members: MembersResponse["members"]; truncated: boolean }> {
  // Mailchimp filters by signup time for subscribed (`since_timestamp_opt`),
  // and by `last_changed` for status transitions (unsub/cleaned).
  const param = status === "subscribed" ? "since_timestamp_opt" : "since_last_changed";
  const url =
    `https://${account.server}.api.mailchimp.com/3.0/lists/${account.listId}/members` +
    `?status=${status}&${param}=${encodeURIComponent(sinceIso)}` +
    `&count=1000&fields=members.merge_fields.MMERGE9,total_items`;
  const res = await fetchWithRetry(url, {
    headers: { Authorization: authHeader(account.apiKey), Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${status}`);
  }
  const data = (await res.json()) as MembersResponse;
  return { members: data.members, truncated: data.total_items > data.members.length };
}

async function fetchOneMovement(
  title: string,
  account: MailchimpAccountConfig,
  sinceIso: string,
): Promise<AudienceMovement> {
  const buckets = emptyBuckets();
  try {
    // Serialize the three status calls per audience — Akamai 503s per-server
    // bursts, and parallelizing here multiplies pressure on the same edge.
    const subs = await fetchMembersByStatus(account, "subscribed", sinceIso);
    const unsubs = await fetchMembersByStatus(account, "unsubscribed", sinceIso);
    const cleaned = await fetchMembersByStatus(account, "cleaned", sinceIso);
    for (const m of subs.members) buckets[classifyLeadSource(m.merge_fields?.MMERGE9)].subscribed++;
    for (const m of unsubs.members) buckets[classifyLeadSource(m.merge_fields?.MMERGE9)].unsubscribed++;
    for (const m of cleaned.members) buckets[classifyLeadSource(m.merge_fields?.MMERGE9)].cleaned++;
    const totals = {
      subscribed: subs.members.length,
      unsubscribed: unsubs.members.length,
      cleaned: cleaned.members.length,
    };
    return { title, listId: account.listId, byBucket: buckets, totals, error: null };
  } catch (e) {
    return {
      title,
      listId: account.listId,
      byBucket: buckets,
      totals: { subscribed: 0, unsubscribed: 0, cleaned: 0 },
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function fetchLeadSourceMovement(
  days: number,
): Promise<{
  perAudience: AudienceMovement[];
  totals: Record<LeadSourceBucket, LeadSourceMovement>;
  grandTotals: { subscribed: number; unsubscribed: number; cleaned: number };
  windowDays: number;
}> {
  const accounts = parseAccounts();
  const sinceIso = new Date(Date.now() - days * 86400000).toISOString();
  const perAudience = await mapWithConcurrency(
    Object.entries(accounts),
    2,
    async ([title, cfg]) => {
      const key = `movement:${days}:${cfg.server}:${cfg.listId}`;
      const result = await getCached(key, MOVEMENT_TTL_MS, () =>
        fetchOneMovement(title, cfg, sinceIso),
      );
      if (result.error) cache.delete(key);
      return result;
    },
  );
  perAudience.sort((a, b) => {
    if (a.error && !b.error) return 1;
    if (!a.error && b.error) return -1;
    return b.totals.subscribed - a.totals.subscribed;
  });
  const totals = emptyBuckets();
  const grandTotals = { subscribed: 0, unsubscribed: 0, cleaned: 0 };
  for (const aud of perAudience) {
    for (const b of LEAD_SOURCE_BUCKETS) {
      totals[b].subscribed += aud.byBucket[b].subscribed;
      totals[b].unsubscribed += aud.byBucket[b].unsubscribed;
      totals[b].cleaned += aud.byBucket[b].cleaned;
    }
    grandTotals.subscribed += aud.totals.subscribed;
    grandTotals.unsubscribed += aud.totals.unsubscribed;
    grandTotals.cleaned += aud.totals.cleaned;
  }
  return { perAudience, totals, grandTotals, windowDays: days };
}
