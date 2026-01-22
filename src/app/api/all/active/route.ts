// app/api/all/active/route.ts
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import BRAND_PROPERTIES_RAW from "@/data/brand_properties.json";
import GA4_PROPERTIES_RAW from "@/data/brand_ga4_properties.json";

// ---------------- Types ----------------
interface StringFilter {
  matchType:
    | "MATCH_TYPE_UNSPECIFIED"
    | "EXACT"
    | "CONTAINS"
    | "BEGINS_WITH"
    | "ENDS_WITH";
  value: string;
  caseSensitive?: boolean;
}

interface GA4Filter {
  fieldName: string;
  stringFilter: StringFilter;
}

// Local type for GA4 dimensionFilter
interface GA4FilterExpression {
  filter: GA4Filter;
}

interface BrandProperty {
  name: string;
  image?: string;
  ga4_filter?: GA4Filter;
  group?: string;
}

interface BrandStats {
  now: number;
  today: number;
  "30": number;
  "365": number;
}

interface CacheEntry {
  data: Record<string, BrandStats>;
  timestamps: Record<string, number>;
}

// ---------------- Constants ----------------
let BRAND_PROPERTIES: Record<string, BrandProperty> =
  BRAND_PROPERTIES_RAW as Record<string, BrandProperty>;
let GA4_PROPS: Record<string, string> = GA4_PROPERTIES_RAW as Record<
  string,
  string
>;

const TTL = {
  now: 60_000,
  today: 5 * 60_000,
  "30": 30 * 60_000,
  "365": 30 * 60_000,
};

const cache: CacheEntry = { data: {}, timestamps: {} };

// ---------- Remote JSON cache ----------
const JSON_TTL = 10 * 60_000;
const jsonCache: Record<string, { data: unknown; fetchedAt: number }> = {};

async function fetchJSON(
  doc: "brand-properties" | "brand-ga4-properties",
  bypassCache: boolean,
): Promise<unknown> {
  const now = Date.now();
  if (
    !bypassCache &&
    jsonCache[doc] &&
    now - jsonCache[doc].fetchedAt < JSON_TTL
  ) {
    return jsonCache[doc].data;
  }

  const url = `https://realtime-ga4-rho.vercel.app/api/json-provider/dashboard-config/${doc}${bypassCache ? "?cache=false" : ""}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(res.statusText);

    const json = await res.json();
    const data = (json as { data?: unknown }).data ?? json;
    if (!bypassCache) jsonCache[doc] = { data, fetchedAt: now };
    return data;
  } catch {
    return doc === "brand-properties"
      ? BRAND_PROPERTIES_RAW
      : GA4_PROPERTIES_RAW;
  }
}

// ---------------- Helpers ----------------
function isFresh(key: string): boolean {
  return (
    Date.now() - (cache.timestamps[key] ?? 0) <
    TTL[key.split(":")[1] as keyof typeof TTL]
  );
}

// Build GA4 dimensionFilter if filter exists
function buildGA4Filter(filter?: GA4Filter): GA4FilterExpression | undefined {
  if (!filter) return undefined;
  return {
    filter: {
      fieldName: filter.fieldName,
      stringFilter: {
        matchType: filter.stringFilter.matchType,
        value: filter.stringFilter.value,
        caseSensitive: filter.stringFilter.caseSensitive ?? false,
      },
    },
  };
}

// Fetch GA4 report
async function fetchGA4(
  client: BetaAnalyticsDataClient,
  brand: string,
  range: "today" | "30" | "365",
): Promise<number> {
  const request = {
    property: `properties/${GA4_PROPS[brand]}`,
    dateRanges:
      range === "today"
        ? [{ startDate: "today", endDate: "today" }]
        : range === "30"
          ? [{ startDate: "30daysAgo", endDate: "today" }]
          : [{ startDate: "365daysAgo", endDate: "today" }],
    metrics: [{ name: "activeUsers" }],
    dimensionFilter: buildGA4Filter(BRAND_PROPERTIES[brand]?.ga4_filter),
  };

  const [response] = await client.runReport(request);
  return Number(response.rows?.[0]?.metricValues?.[0]?.value ?? 0);
}

// Fetch GA4 realtime report or estimate
async function fetchRealtime(
  client: BetaAnalyticsDataClient,
  brand: string,
  todayValue: number,
): Promise<number> {
  if (BRAND_PROPERTIES[brand]?.ga4_filter) {
    // For filtered brands, estimate realtime as today / 48
    return Math.max(1, Math.round(todayValue / 48));
  } else {
    const [res] = await client.runRealtimeReport({
      property: `properties/${GA4_PROPS[brand]}`,
      metrics: [{ name: "activeUsers" }],
    });
    return Number(
      res.rows?.[0]?.metricValues?.[0]?.value ??
        Math.max(1, Math.round(todayValue / 48)),
    );
  }
}

// ---------------- Handler ----------------
export async function GET(req: Request) {
  const url = new URL(req.url);
  const bypassCache = url.searchParams.get("cache") === "false";

  BRAND_PROPERTIES = (await fetchJSON(
    "brand-properties",
    bypassCache,
  )) as Record<string, BrandProperty>;
  GA4_PROPS = (await fetchJSON("brand-ga4-properties", bypassCache)) as Record<
    string,
    string
  >;

  if (bypassCache) cache.timestamps = {};

  const client = new BetaAnalyticsDataClient({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON as string),
  });

  const brands = Object.keys(BRAND_PROPERTIES);

  await Promise.all(
    brands.map(async (brand) => {
      cache.data[brand] ??= { now: 0, today: 0, "30": 0, "365": 0 };

      // ---- TODAY ----
      if (!isFresh(`${brand}:today`)) {
        cache.data[brand].today = await fetchGA4(client, brand, "today");
        cache.timestamps[`${brand}:today`] = Date.now();
      }

      // ---- 30 DAYS ----
      if (!isFresh(`${brand}:30`)) {
        cache.data[brand]["30"] = await fetchGA4(client, brand, "30");
        cache.timestamps[`${brand}:30`] = Date.now();
      }

      // ---- 365 DAYS ----
      if (!isFresh(`${brand}:365`)) {
        cache.data[brand]["365"] = await fetchGA4(client, brand, "365");
        cache.timestamps[`${brand}:365`] = Date.now();
      }

      // ---- REALTIME ----
      if (!isFresh(`${brand}:now`)) {
        cache.data[brand].now = await fetchRealtime(
          client,
          brand,
          cache.data[brand].today,
        );
        cache.timestamps[`${brand}:now`] = Date.now();
      }
    }),
  );

  return Response.json({ data: cache.data });
}
