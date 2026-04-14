import { Suspense } from "react";
import { getCollection } from "@/lib/mongodb";
import { getAwards, Brand, Award } from "@/lib/GetAwards";
import AwardsGridClient from "./AwardsGridClient";
import LoadingPage from "@/src/components/LoadingPage";

interface SiteEntry {
  awards?: boolean;
  url?: string;
  name?: string;
}

interface BrandCache {
  awards: Award[];
  timestamp: number;
}

const brandAwardsCache: Record<string, BrandCache> = {};
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

async function AwardsContent({ forceRefresh }: { forceRefresh: boolean }) {
  const now = Date.now();
  const col = await getCollection("dashboard-config");
  const doc = await col.findOne({ uid: "brand-all-properties" });
  const config: Record<string, SiteEntry> = doc?.data || {};

  const brands: Brand[] = Object.entries(config)
    .filter(([, site]) => site?.awards && site?.url)
    .map(([brand, site]) => ({ brand, name: site.name ?? brand, url: site.url! }));

  const awardsPromises = brands.map(async (b) => {
    const cached = brandAwardsCache[b.brand];
    if (!forceRefresh && cached && now - cached.timestamp < CACHE_DURATION) {
      return cached.awards;
    }

    const awards = await getAwards([b]);
    brandAwardsCache[b.brand] = { awards, timestamp: now };
    return awards;
  });

  const awardsArrays = await Promise.all(awardsPromises);
  const allAwards = awardsArrays.flat();

  allAwards.sort(
    (a, b) => new Date(a.field_date).getTime() - new Date(b.field_date).getTime()
  );

  return <AwardsGridClient awards={allAwards} />;
}

export default async function AwardsPage({
  searchParams,
}: {
  searchParams: Promise<{ cache?: string }>;
}) {
  const params = await searchParams;
  const forceRefresh = params.cache === "false";

  return (
    <div className="min-h-screen max-w-screen overflow-auto bg-white text-gray-900">
      <Suspense fallback={<LoadingPage loadingText="Loading Awards..." />}>
        <AwardsContent forceRefresh={forceRefresh} />
      </Suspense>
    </div>
  );
}
