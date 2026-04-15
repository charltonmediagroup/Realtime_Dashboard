import { getCollection } from "@/lib/mongodb";
import { fetchVimeoVideos, fetchVimeoVideosByBrand, VimeoVideo } from "@/lib/vimeo";

interface BrandVideoCache {
  videos: VimeoVideo[];
  timestamp: number;
}

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const MONGO_CACHE_UID = "videos-brand-cache";

const memoryCache: Record<string, BrandVideoCache> = {};

async function getDbCache(): Promise<Record<string, BrandVideoCache>> {
  try {
    const col = await getCollection("dashboard-config");
    const doc = await col.findOne({ uid: MONGO_CACHE_UID });
    return doc?.data || {};
  } catch {
    return {};
  }
}

async function saveDbCache(cache: Record<string, BrandVideoCache>) {
  try {
    const col = await getCollection("dashboard-config");
    await col.updateOne(
      { uid: MONGO_CACHE_UID },
      { $set: { uid: MONGO_CACHE_UID, data: cache } },
      { upsert: true },
    );
  } catch (err) {
    console.warn("Failed to save videos cache to MongoDB:", err);
  }
}

export async function getCachedVideos(
  brandTag?: string,
  forceRefresh = false,
): Promise<VimeoVideo[]> {
  const now = Date.now();
  const cacheKey = brandTag || "__all__";

  // Load MongoDB cache into memory on cold start
  if (!forceRefresh && Object.keys(memoryCache).length === 0) {
    const dbCache = await getDbCache();
    for (const [key, entry] of Object.entries(dbCache)) {
      if (entry.timestamp && now - entry.timestamp < CACHE_DURATION) {
        memoryCache[key] = entry;
      }
    }
  }

  const cached = memoryCache[cacheKey];
  if (!forceRefresh && cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.videos;
  }

  const videos = brandTag
    ? await fetchVimeoVideosByBrand(brandTag)
    : await fetchVimeoVideos();

  memoryCache[cacheKey] = { videos, timestamp: now };

  // Persist to MongoDB in background
  saveDbCache({ ...memoryCache });

  return videos;
}
