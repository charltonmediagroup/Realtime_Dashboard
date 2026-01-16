// app/api/active-365-days/[brand]/route.ts
import { getGAClient } from "@/lib/ga4";
import GA4_PROPERTIES_RAW from "@/data/brand_ga4_properties.json";


interface CacheEntry {
  value: number;
  timestamp: number;
}

// Cache per brand + interval
const cacheMap: Record<string, Record<number, CacheEntry>> = {};

const DEFAULT_CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const MIN_INTERVAL = 60000; // 1 min

const GA4_PROPERTIES: Record<string, string> = GA4_PROPERTIES_RAW;

const DEFAULT_PROPERTY_ID: string = process.env.GA4_PROPERTY_ID as string;
if (!DEFAULT_PROPERTY_ID) throw new Error("GA4_PROPERTY_ID is not defined");

export function resolvePropertyId(brand: string): string {
  if (brand === "default") return DEFAULT_PROPERTY_ID;

  const propertyId = GA4_PROPERTIES[brand];
  if (!propertyId) {
    console.error(`[GA4] Brand "${brand}" not found in GA4_PROPERTIES.json`);
    throw new Error(`[GA4] No GA4 property ID for brand "${brand}"`);
  }

  return propertyId;
}


export async function GET(
  req: Request,
  { params }: { params: Promise<{ brand: string }> }
) {
  const { brand } = await params;
  const now = Date.now();

  try {
    const url = new URL(req.url);
    const intervalParam = url.searchParams.get("intervalms");
    let intervalms = intervalParam
      ? Number(intervalParam)
      : DEFAULT_CACHE_DURATION;

    if (isNaN(intervalms) || intervalms < MIN_INTERVAL) {
      intervalms = MIN_INTERVAL;
    }

    if (!cacheMap[brand]) cacheMap[brand] = {};

    const cached = cacheMap[brand][intervalms];
    if (cached && now - cached.timestamp < intervalms) {
      return Response.json(
        { activeLast365Days: cached.value, cached: true },
        { status: 200 }
      );
    }

    const propertyId = resolvePropertyId(brand);
    const client = getGAClient();
    const property = `properties/${propertyId}`;

    console.log(`[GA4] Fetching ACTIVE LAST 365 DAYS for ${brand}`);

    const [response] = await client.runReport({
      property,
      dateRanges: [
        {
          startDate: "365daysAgo",
          endDate: "today",
        },
      ],
      metrics: [{ name: "activeUsers" }],
    });

    let value = 0;
    if (response.rows?.[0]?.metricValues?.[0]?.value) {
      value = Number(response.rows[0].metricValues[0].value);
    }

    cacheMap[brand][intervalms] = {
      value,
      timestamp: now,
    };

    return Response.json(
      { activeLast365Days: value, cached: false },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error("GA4 API ERROR:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}