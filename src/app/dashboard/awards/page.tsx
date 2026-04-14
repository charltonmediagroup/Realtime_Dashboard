import { Suspense } from "react";
import AwardsGridClient from "./AwardsGridClient";
import LoadingPage from "@/src/components/LoadingPage";
import { Award } from "@/lib/GetAwards";

const BASE_URL = process.env.JSON_PROVIDER_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

async function AwardsContent({ forceRefresh }: { forceRefresh: boolean }) {
  const cacheParam = forceRefresh ? "?cache=false" : "";
  const res = await fetch(`${BASE_URL}/api/awards${cacheParam}`, {
    cache: "no-store",
  });
  const awards: Award[] = await res.json();
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
