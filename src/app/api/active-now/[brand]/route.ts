// app/api/active-now/[brand]/route.ts
import { getGAClient } from "@/lib/ga4";

interface CacheEntry {
  value: number;
  timestamp: number;
}

// Global cache map per interval and brand
const cacheMap: Record<string, Record<number, CacheEntry>> = {};

// Default cache duration from ENV (ms)
const DEFAULT_CACHE_DURATION = Number(process.env.ACTIVE_USERS_CACHE_MS) || 60000;

// Minimum interval: 5 seconds
const MIN_INTERVAL = 5000;

function resolvePropertyId(brand: string): string {
  const fallback = process.env.GA4_PROPERTY_ID;
  if (!fallback) throw new Error("GA4_PROPERTY_ID is not defined");

  if (brand === "default") return fallback;

  const raw = process.env.GA4_PROPERTIES_JSON;
  if (!raw) return fallback;

  try {
    const map = JSON.parse(raw) as Record<string, string>;
    if (!map[brand]) {
      console.warn(`[GA4] Brand "${brand}" not found in GA4_PROPERTIES_JSON. Using default property.`);
      return fallback;
    }
    return map[brand];
  } catch (err) {
    console.error("[GA4] Failed to parse GA4_PROPERTIES_JSON. Using default property.", err);
    return fallback;
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ brand: string }> }
) {
  const { brand } = await params; // unwrap the Promise
  const now = Date.now();

  try {
    const url = new URL(req.url);
    const intervalParam = url.searchParams.get("intervalms");
    let intervalms = intervalParam ? Number(intervalParam) : DEFAULT_CACHE_DURATION;

    if (isNaN(intervalms) || intervalms < MIN_INTERVAL) intervalms = MIN_INTERVAL;

    if (!cacheMap[brand]) cacheMap[brand] = {};

    const cacheEntry = cacheMap[brand][intervalms];
    if (cacheEntry && now - cacheEntry.timestamp < intervalms) {
      console.log(`[GA4] Returning cached value for ${brand}: ${cacheEntry.value}`);
      return Response.json({ activeUsers: cacheEntry.value, cached: true }, { status: 200 });
    }

    const propertyId = resolvePropertyId(brand);
    if (!propertyId) {
      throw new Error(`No valid GA4 property found for brand "${brand}"`);
    }

    console.log(`[GA4] Using propertyId "${propertyId}" for brand "${brand}"`);

    const client = getGAClient();
    const property = `properties/${propertyId}`;

    console.log(`[GA4] Fetching active users for ${brand} at ${new Date().toISOString()}`);

    const [response] = await client.runRealtimeReport({
      property,
      metrics: [{ name: "activeUsers" }],
    });

    let value = 0;

    if (response.totals?.[0]?.metricValues?.[0]?.value !== undefined) {
      value = Number(response.totals[0].metricValues[0].value);
    } else if (response.rows?.[0]?.metricValues?.[0]?.value !== undefined) {
      value = Number(response.rows[0].metricValues[0].value);
    }

    cacheMap[brand][intervalms] = { value, timestamp: now };

    console.log(`[GA4] Active users fetched for ${brand}: ${value}`);

    return Response.json({ activeUsers: value, cached: false }, { status: 200 });
  } catch (error) {
    let message: string;
    if (error instanceof Error) message = error.message;
    else message = String(error);

    console.error("GA4 API ERROR:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
