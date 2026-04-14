import { getCollection } from "@/lib/mongodb";
import { getAwards, Brand, Award } from "@/lib/GetAwards";

interface BrandCache {
  awards: Award[];
  timestamp: number;
}

const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;
const MONGO_CACHE_UID = "awards-brand-cache";

// In-memory layer (fast, but lost on cold start)
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
    console.warn("Failed to save awards cache to MongoDB:", err);
  }
}

export async function getCachedAwards(
  brands: Brand[],
  forceRefresh = false,
): Promise<Award[]> {
  const now = Date.now();

  // Load MongoDB cache into memory on cold start
  if (!forceRefresh && Object.keys(memoryCache).length === 0) {
    const dbCache = await getDbCache();
    for (const [brand, entry] of Object.entries(dbCache)) {
      if (entry.timestamp && now - entry.timestamp < CACHE_DURATION) {
        memoryCache[brand] = entry;
      }
    }
  }

  const awardsPromises = brands.map(async (b) => {
    const cached = memoryCache[b.brand];
    if (!forceRefresh && cached && now - cached.timestamp < CACHE_DURATION) {
      return cached.awards;
    }

    const awards = await getAwards([b]);
    memoryCache[b.brand] = { awards, timestamp: now };
    return awards;
  });

  const awardsArrays = await Promise.all(awardsPromises);
  const allAwards = awardsArrays.flat();

  allAwards.sort(
    (a, b) => new Date(a.field_date).getTime() - new Date(b.field_date).getTime(),
  );

  // Persist to MongoDB in background (don't block response)
  saveDbCache({ ...memoryCache });

  return allAwards;
}
