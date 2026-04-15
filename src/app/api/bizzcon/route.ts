import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { EventBrand } from "@/lib/GetEvents";
import { getCachedEvents } from "@/lib/eventsCache";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("cache") === "false";

    const col = await getCollection("dashboard-config");
    const doc = await col.findOne({ uid: "brand-all-properties" });
    const config = doc?.data || {};

    const brands: EventBrand[] = Object.entries(config)
      .filter(([, site]: any) => site?.events && site?.url)
      .map(([brand, site]: any) => ({ brand, name: site.name ?? brand, url: site.url!, image: site.image }));

    const allEvents = await getCachedEvents(brands, forceRefresh);

    return NextResponse.json(allEvents);
  } catch (err) {
    console.error("API /bizzcon failed:", err);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
