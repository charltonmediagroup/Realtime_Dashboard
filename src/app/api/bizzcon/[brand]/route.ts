import { NextResponse, NextRequest } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { getEvents, BizzconEvent } from "@/lib/GetEvents";

interface BrandCache {
  events: BizzconEvent[];
  timestamp: number;
}

const brandEventsCache: Record<string, BrandCache> = {};
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ brand: string }> },
) {
  try {
    const { brand } = await params;
    const now = Date.now();
    const forceRefresh = req.nextUrl.searchParams.get("cache") === "false";

    const cached = brandEventsCache[brand];
    if (!forceRefresh && cached && now - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.events);
    }

    const col = await getCollection("dashboard-config");
    const doc = await col.findOne(
      { uid: "brand-all-properties", [`data.${brand}`]: { $exists: true } },
      { projection: { [`data.${brand}`]: 1 } },
    );

    const site = doc?.data?.[brand];

    if (!site || !site.events || !site.url) {
      return NextResponse.json(
        { error: "Brand not found or no events" },
        { status: 404 },
      );
    }

    const events = await getEvents([{ brand, name: site.name ?? brand, url: site.url, image: site.image }]);
    brandEventsCache[brand] = { events, timestamp: now };

    return NextResponse.json(events);
  } catch (err) {
    console.error(`API /bizzcon/${(await params).brand} failed:`, err);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
