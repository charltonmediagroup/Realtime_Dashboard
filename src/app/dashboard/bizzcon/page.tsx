import { Suspense } from "react";
import { getCollection } from "@/lib/mongodb";
import { EventBrand } from "@/lib/GetEvents";
import { getCachedEvents } from "@/lib/eventsCache";
import BizzconGridClient from "./BizzconGridClient";
import LoadingPage from "@/src/components/LoadingPage";

interface SiteEntry {
  events?: boolean;
  url?: string;
  name?: string;
  image?: string;
}

async function BizzconContent({ forceRefresh }: { forceRefresh: boolean }) {
  const col = await getCollection("dashboard-config");
  const doc = await col.findOne({ uid: "brand-all-properties" });
  const config: Record<string, SiteEntry> = doc?.data || {};

  const brands: EventBrand[] = Object.entries(config)
    .filter(([, site]) => site?.events && site?.url)
    .map(([brand, site]) => ({ brand, name: site.name ?? brand, url: site.url!, image: site.image }));

  const events = await getCachedEvents(brands, forceRefresh);
  return <BizzconGridClient events={events} />;
}

export default async function BizzconPage({
  searchParams,
}: {
  searchParams: Promise<{ cache?: string }>;
}) {
  const params = await searchParams;
  const forceRefresh = params.cache === "false";

  return (
    <div className="min-h-screen max-w-screen overflow-auto">
      <Suspense fallback={<LoadingPage loadingText="Loading Events..." />}>
        <BizzconContent forceRefresh={forceRefresh} />
      </Suspense>
    </div>
  );
}
