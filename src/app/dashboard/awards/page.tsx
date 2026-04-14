import { Suspense } from "react";
import { getCollection } from "@/lib/mongodb";
import { getAwards, Brand } from "@/lib/GetAwards";
import AwardsGridClient from "./AwardsGridClient";
import LoadingPage from "@/src/components/LoadingPage";

interface SiteEntry {
  awards?: boolean;
  url?: string;
  name?: string;
}

async function AwardsContent({ forceRefresh }: { forceRefresh: boolean }) {
  const col = await getCollection("dashboard-config");
  const doc = await col.findOne({ uid: "brand-all-properties" });
  const config: Record<string, SiteEntry> = doc?.data || {};

  const brands: Brand[] = Object.entries(config)
    .filter(([, site]) => site?.awards && site?.url)
    .map(([brand, site]) => ({ brand, name: site.name ?? brand, url: site.url! }));

  const awards = await getAwards(brands);
  return <AwardsGridClient awards={awards} />;
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
