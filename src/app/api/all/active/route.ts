import { getGAClient } from "@/lib/ga4";
import BRAND_PROPERTIES_RAW from "@/data/brand_properties.json";
import GA4_PROPERTIES from "@/data/ga4_properties.json";

interface BrandStats {
  now: number;
  today: number;
  "30": number;
  "365": number;
}

interface CacheEntry {
  data: Record<string, BrandStats>;
  timestamps: {
    now: number;
    today: number;
    "30": number;
    "365": number;
  };
}

// Define proper type for brand properties
interface BrandProperty {
  name: string;
  ga4_filter?: any;
}

const BRAND_PROPERTIES: Record<string, BrandProperty> = BRAND_PROPERTIES_RAW as Record<
  string,
  BrandProperty
>;

// Cache TTLs
const TTL_NOW = 60_000;
const TTL_TODAY = 5 * 60_000;
const TTL_30 = 30 * 60_000;
const TTL_365 = 30 * 60_000;

let cache: CacheEntry | null = null;

// ---------- Helpers ----------

function getBrands(): string[] {
  return Object.keys(BRAND_PROPERTIES);
}

function getPropertyId(brand: string): string {
  const fallback = process.env.GA4_PROPERTY_ID;
  if (!fallback) throw new Error("GA4_PROPERTY_ID is not defined");

  return (GA4_PROPERTIES as Record<string, string>)[brand] ?? fallback;
}

function getGA4Filter(brand: string) {
  return BRAND_PROPERTIES[brand]?.ga4_filter;
}

function isFresh(timestamp: number, ttl: number) {
  return Date.now() - timestamp < ttl;
}

function logValue(brand: string, label: string, value: number, fromCache: boolean) {
  console.log(
    `[GA4] ${label} for ${brand}: ${value} ${fromCache ? "(cache)" : "(fetched)"}`
  );
}

// ---------- Handler ----------

export async function GET() {
  const client = getGAClient();
  const brands = getBrands();
  const nowTs = Date.now();

  if (!cache) {
    cache = {
      data: {},
      timestamps: { now: 0, today: 0, "30": 0, "365": 0 },
    };
  }

  const results: Record<string, BrandStats> = {};

  await Promise.all(
    brands.map(async (brand) => {
      cache!.data[brand] ??= { now: 0, today: 0, "30": 0, "365": 0 };
      const brandData = cache!.data[brand];
      const filter = getGA4Filter(brand);

      async function fetchReport(dateRange: { startDate: string; endDate: string }) {
        try {
          const [res] = await client.runReport({
            property: `properties/${getPropertyId(brand)}`,
            dateRanges: [dateRange],
            metrics: [{ name: "activeUsers" }],
            ...(filter ? { dimensionFilter: { filter } } : {}),
          });
          return Number(res.rows?.[0]?.metricValues?.[0]?.value ?? 0);
        } catch (err) {
          console.error(`[GA4] Fetch failed for ${brand}`, err);
          return 0;
        }
      }

      // ---------- TODAY ----------
      const todayFromCache = isFresh(cache!.timestamps.today, TTL_TODAY);
      if (!todayFromCache) {
        brandData.today = await fetchReport({ startDate: "today", endDate: "today" });
      }
      logValue(brand, "ACTIVE TODAY", brandData.today, todayFromCache);

      // ---------- NOW ----------
      const nowFromCache = isFresh(cache!.timestamps.now, TTL_NOW);
      if (!nowFromCache) {
        if (filter) {
          // Approximate: TODAY ÷ 48 (30-min windows)
          brandData.now = Math.max(1, Math.round(brandData.today / 48));
        } else {
          try {
            const [res] = await client.runRealtimeReport({
              property: `properties/${getPropertyId(brand)}`,
              metrics: [{ name: "activeUsers" }],
            });
            brandData.now = Number(res.rows?.[0]?.metricValues?.[0]?.value ?? 0);
          } catch {
            brandData.now = 0;
          }
        }
      }
      logValue(
        brand,
        filter ? "ACTIVE NOW (approx)" : "ACTIVE NOW",
        brandData.now,
        nowFromCache
      );

      // ---------- 30 DAYS ----------
      const d30FromCache = isFresh(cache!.timestamps["30"], TTL_30);
      if (!d30FromCache) {
        brandData["30"] = await fetchReport({ startDate: "30daysAgo", endDate: "today" });
      }
      logValue(brand, "ACTIVE 30 DAYS", brandData["30"], d30FromCache);

      // ---------- 365 DAYS ----------
      const d365FromCache = isFresh(cache!.timestamps["365"], TTL_365);
      if (!d365FromCache) {
        brandData["365"] = await fetchReport({ startDate: "365daysAgo", endDate: "today" });
      }
      logValue(brand, "ACTIVE 365 DAYS", brandData["365"], d365FromCache);

      results[brand] = brandData;
    })
  );

  // Update timestamps (only once)
  if (!isFresh(cache.timestamps.now, TTL_NOW)) cache.timestamps.now = nowTs;
  if (!isFresh(cache.timestamps.today, TTL_TODAY)) cache.timestamps.today = nowTs;
  if (!isFresh(cache.timestamps["30"], TTL_30)) cache.timestamps["30"] = nowTs;
  if (!isFresh(cache.timestamps["365"], TTL_365)) cache.timestamps["365"] = nowTs;

  return Response.json({ data: results });
}
