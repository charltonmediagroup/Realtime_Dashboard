import { getCollection } from "@/lib/mongodb";
import { getEvents, EventBrand, BizzconEvent } from "@/lib/GetEvents";

interface BrandCache {
  events: BizzconEvent[];
  timestamp: number;
}

const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;
const MONGO_CACHE_UID = "events-brand-cache";

const memoryCache: Record<string, BrandCache> = {};

async function getDbCache(): Promise<Record<string, BrandCache>> {
  try {
    const col = await getCollection("dashboard-config");
    const doc = await col.findOne({ uid: MONGO_CACHE_UID });
    return doc?.data || {};
  } catch {
    return {};
  }
}

async function saveDbCache(cache: Record<string, BrandCache>) {
  try {
    const col = await getCollection("dashboard-config");
    await col.updateOne(
      { uid: MONGO_CACHE_UID },
      { $set: { uid: MONGO_CACHE_UID, data: cache } },
      { upsert: true },
    );
  } catch (err) {
    console.warn("Failed to save events cache to MongoDB:", err);
  }
}

export async function getCachedEvents(
  brands: EventBrand[],
  forceRefresh = false,
): Promise<BizzconEvent[]> {
  const now = Date.now();

  if (!forceRefresh && Object.keys(memoryCache).length === 0) {
    const dbCache = await getDbCache();
    for (const [brand, entry] of Object.entries(dbCache)) {
      if (entry.timestamp && now - entry.timestamp < CACHE_DURATION) {
        memoryCache[brand] = entry;
      }
    }
  }

  const eventsPromises = brands.map(async (b) => {
    const cached = memoryCache[b.brand];
    if (!forceRefresh && cached && now - cached.timestamp < CACHE_DURATION) {
      return cached.events;
    }

    const events = await getEvents([b]);
    memoryCache[b.brand] = { events, timestamp: now };
    return events;
  });

  const eventsArrays = await Promise.all(eventsPromises);
  const allEvents = eventsArrays.flat();

  allEvents.sort(
    (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
  );

  saveDbCache({ ...memoryCache });

  return allEvents;
}
