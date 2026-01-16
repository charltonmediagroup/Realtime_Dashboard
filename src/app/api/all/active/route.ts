import { getGAClient } from "@/lib/ga4";
import BRAND_PROPERTIES_RAW from "@/data/brand_properties.json";
import GA4_PROPERTIES_RAW from "@/data/brand_ga4_properties.json";

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

interface BrandProperty {
  name: string;
  ga4_filter?: any;
}

// ---------------- Constants ----------------
let BRAND_PROPERTIES: Record<string, BrandProperty> = BRAND_PROPERTIES_RAW;
let GA4_PROPS: Record<string, string> = GA4_PROPERTIES_RAW;

const TTL = {
  now: 60_000,
  today: 5 * 60_000,
  "30": 30 * 60_000,
  "365": 30 * 60_000,
};

let cache: CacheEntry = {
  data: {},
  timestamps: {},
};

// ---------- Remote JSON cache ----------
const jsonCache: Record<string, { data: any; fetchedAt: number }> = {};
const JSON_TTL = 10 * 60_000;

async function fetchJSON(doc: "brand-properties" | "brand-ga4-properties", bypassCache: boolean) {
  const now = Date.now();
  if (!bypassCache && jsonCache[doc] && now - jsonCache[doc].fetchedAt < JSON_TTL) {
    return jsonCache[doc].data;
  }

  const url = `https://realtime-ga4-rho.vercel.app/api/json-provider/dashboard-config/${doc}` + (bypassCache ? "?cache=false" : "");

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(res.statusText);

    const json = await res.json();
    const data = json.data ?? json;

    if (!bypassCache) {
      jsonCache[doc] = { data, fetchedAt: now };
    }

    return data;
  } catch {
    return doc === "brand-properties"
      ? BRAND_PROPERTIES_RAW
      : GA4_PROPERTIES_RAW;
  }
}

// ---------- Helpers ----------
function isFresh(key: string) {
  return Date.now() - (cache.timestamps[key] ?? 0) < TTL[key.split(":")[1] as keyof typeof TTL];
}

async function fetchGA(
  client: any,
  brand: string,
  range: "today" | "30" | "365"
) {
  const filter = BRAND_PROPERTIES[brand]?.ga4_filter;

  const [res] = await client.runReport({
    property: `properties/${GA4_PROPS[brand]}`,
    dateRanges: [
      range === "today"
        ? { startDate: "today", endDate: "today" }
        : range === "30"
          ? { startDate: "30daysAgo", endDate: "today" }
          : { startDate: "365daysAgo", endDate: "today" },
    ],
    metrics: [{ name: "activeUsers" }],
    ...(filter ? { dimensionFilter: { filter } } : {}),
  });

  return Number(res?.rows?.[0]?.metricValues?.[0]?.value ?? 0);
}

// ---------------- Handler ----------------
export async function GET(req: Request) {
  const url = new URL(req.url);
  const bypassCache = url.searchParams.get("cache") === "false";

  BRAND_PROPERTIES = await fetchJSON("brand-properties", bypassCache);
  GA4_PROPS = await fetchJSON("brand-ga4-properties", bypassCache);

    if (bypassCache) {
    cache.timestamps = {};
  }

  const client = getGAClient();
  const brands = Object.keys(BRAND_PROPERTIES);

  await Promise.all(
    brands.map(async (brand) => {
      cache.data[brand] ??= { now: 0, today: 0, "30": 0, "365": 0 };

      // ---- TODAY ----
      if (!isFresh(`${brand}:today`)) {
        cache.data[brand].today = await fetchGA(client, brand, "today");
        cache.timestamps[`${brand}:today`] = Date.now();
      }

      // ---- 30 DAYS ----
      if (!isFresh(`${brand}:30`)) {
        cache.data[brand]["30"] = await fetchGA(client, brand, "30");
        cache.timestamps[`${brand}:30`] = Date.now();
      }

      // ---- 365 DAYS ----
      if (!isFresh(`${brand}:365`)) {
        cache.data[brand]["365"] = await fetchGA(client, brand, "365");
        cache.timestamps[`${brand}:365`] = Date.now();
      }

      // ---- REALTIME ----
      if (!isFresh(`${brand}:now`)) {
        if (BRAND_PROPERTIES[brand]?.ga4_filter) {
          cache.data[brand].now = Math.max(
            1,
            Math.round(cache.data[brand].today / 48)
          );
        } else {
          const [res] = await client.runRealtimeReport({
            property: `properties/${GA4_PROPS[brand]}`,
            metrics: [{ name: "activeUsers" }],
          });
          cache.data[brand].now = Number(
            res?.rows?.[0]?.metricValues?.[0]?.value ??
            Math.max(1, Math.round(cache.data[brand].today / 48))
          );
        }
        cache.timestamps[`${brand}:now`] = Date.now();
      }
    })
  );

  return Response.json({ data: cache.data });
}
