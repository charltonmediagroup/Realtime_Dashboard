import Link from "next/link";
import { getCollection } from "@/lib/db";

export const dynamic = "force-dynamic";

async function loadStats() {
  const col = await getCollection<{ uid: string; data: unknown }>("dashboard-config");
  const [team, brands, ga4, awardsCache, eventsCache, videosCache] = await Promise.all([
    col.findOne({ uid: "editorial-roster" }),
    col.findOne({ uid: "brand-all-properties" }),
    col.findOne({ uid: "brand-ga4-properties" }),
    col.findOne({ uid: "awards-brand-cache" }),
    col.findOne({ uid: "events-brand-cache" }),
    col.findOne({ uid: "videos-library" }),
  ]);
  return {
    teamCount: Array.isArray(team?.data) ? team!.data.length : 0,
    brandCount:
      brands?.data && typeof brands.data === "object"
        ? Object.keys(brands.data as Record<string, unknown>).length
        : 0,
    ga4Count:
      ga4?.data && typeof ga4.data === "object"
        ? Object.keys(ga4.data as Record<string, unknown>).length
        : 0,
    awardsCacheBrands: cacheBrandCount(awardsCache?.data),
    eventsCacheBrands: cacheBrandCount(eventsCache?.data),
    videosCount: videosCache?.data && typeof videosCache.data === "object"
      ? Object.keys(videosCache.data as Record<string, unknown>).length
      : 0,
  };
}

function cacheBrandCount(data: unknown): number {
  if (!data || typeof data !== "object" || Array.isArray(data)) return 0;
  return Object.keys(data as Record<string, unknown>).length;
}

export default async function AdminHomePage() {
  let stats: Awaited<ReturnType<typeof loadStats>> | null = null;
  let error: string | null = null;
  try {
    stats = await loadStats();
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold mb-4">Overview</h1>
      <p className="text-sm text-neutral-600 mb-6">
        Edit the dashboard&apos;s configuration documents stored in MongoDB.
      </p>

      {error && (
        <div className="mb-6 text-sm text-red-700 border border-red-200 bg-red-50 rounded px-3 py-2">
          Failed to load stats: {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Tile label="Editorial team" value={stats.teamCount} href="/admin/roster" suffix="people" />
          <Tile label="Brands" value={stats.brandCount} href="/admin/brands" suffix="entries" />
          <Tile label="GA4 properties" value={stats.ga4Count} href="/admin/ga4" suffix="mappings" />
          <Tile label="Awards cache" value={stats.awardsCacheBrands} href="/admin/docs/dashboard-config/awards-brand-cache" suffix="brands" />
          <Tile label="Events cache" value={stats.eventsCacheBrands} href="/admin/docs/dashboard-config/events-brand-cache" suffix="brands" />
          <Tile label="Videos library" value={stats.videosCount} href="/admin/docs/dashboard-config/videos-library" suffix="entries" />
        </div>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  href,
  suffix,
}: {
  label: string;
  value: number;
  href: string;
  suffix: string;
}) {
  return (
    <Link
      href={href}
      className="block border border-neutral-200 bg-white rounded-lg px-4 py-3 hover:border-neutral-300 hover:shadow-sm transition"
    >
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      <div className="text-xs text-neutral-400 mt-0.5">{suffix}</div>
    </Link>
  );
}
