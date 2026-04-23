import { getCollection } from "@/lib/mongodb";
import { fetchVimeoVideos, VimeoVideo } from "@/lib/vimeo";

const REFRESH_INTERVAL = 60 * 60 * 1000;  // 1 hour between incremental refreshes
const INITIAL_BACKFILL_COUNT = 300;       // one-time full fetch (manual: ?backfill=true)
const RECENT_FETCH_COUNT = 25;            // incremental refresh size
const LIBRARY_UID = "videos-library";

interface VideoLibrary {
  videos: VimeoVideo[];
  lastRefresh: number;
  lastFullSync: number;
}

// In-memory mirror to avoid hitting Mongo on every request
let memoryLib: VideoLibrary | null = null;

async function loadLib(): Promise<VideoLibrary> {
  if (memoryLib) return memoryLib;
  try {
    const col = await getCollection("dashboard-config");
    const doc = await col.findOne({ uid: LIBRARY_UID });
    const data = doc?.data as Partial<VideoLibrary> | undefined;
    memoryLib = {
      videos: data?.videos ?? [],
      lastRefresh: data?.lastRefresh ?? 0,
      lastFullSync: data?.lastFullSync ?? 0,
    };
  } catch {
    memoryLib = { videos: [], lastRefresh: 0, lastFullSync: 0 };
  }
  return memoryLib;
}

async function saveLib(lib: VideoLibrary) {
  memoryLib = lib;
  try {
    const col = await getCollection("dashboard-config");
    await col.updateOne(
      { uid: LIBRARY_UID },
      { $set: { uid: LIBRARY_UID, data: lib } },
      { upsert: true },
    );
  } catch (err) {
    console.warn("Failed to save videos library to MongoDB:", err);
  }
}

function sortByCreatedDesc(videos: VimeoVideo[]): VimeoVideo[] {
  return [...videos].sort((a, b) => b.createdTime.localeCompare(a.createdTime));
}

function mergeUpsert(existing: VimeoVideo[], fresh: VimeoVideo[]): VimeoVideo[] {
  const byId = new Map<string, VimeoVideo>();
  for (const v of existing) byId.set(v.id, v);
  for (const v of fresh) byId.set(v.id, v); // fresh wins
  return sortByCreatedDesc(Array.from(byId.values()));
}

/**
 * Get the video library.
 * - First ever call (empty library): full backfill of INITIAL_BACKFILL_COUNT videos.
 * - After REFRESH_INTERVAL: incremental refresh — fetch RECENT_FETCH_COUNT newest, upsert.
 * - forceBackfill=true: re-run the full backfill on demand.
 * - brandTag: if provided, filter by tag (case-insensitive).
 */
export async function getCachedVideos(
  brandTag?: string,
  forceBackfill = false,
): Promise<VimeoVideo[]> {
  const now = Date.now();
  const lib = await loadLib();

  const needsFullSync = forceBackfill || lib.videos.length === 0;
  const needsIncremental =
    !needsFullSync && now - lib.lastRefresh > REFRESH_INTERVAL;

  if (needsFullSync) {
    try {
      const fresh = await fetchVimeoVideos(undefined, INITIAL_BACKFILL_COUNT);
      // Replace library entirely — drops videos deleted on Vimeo.
      await saveLib({
        videos: sortByCreatedDesc(fresh),
        lastRefresh: now,
        lastFullSync: now,
      });
    } catch (err) {
      console.warn("Full re-sync failed, serving stale library:", err);
    }
  } else if (needsIncremental) {
    try {
      const recent = await fetchVimeoVideos(undefined, RECENT_FETCH_COUNT);
      const merged = mergeUpsert(lib.videos, recent);
      await saveLib({
        videos: merged,
        lastRefresh: now,
        lastFullSync: lib.lastFullSync,
      });
    } catch (err) {
      console.warn("Incremental refresh failed, serving stale library:", err);
    }
  }

  const current = memoryLib?.videos ?? [];

  if (brandTag) {
    const t = brandTag.toLowerCase();
    return current.filter((v) => v.tags?.includes(t));
  }
  return current;
}
