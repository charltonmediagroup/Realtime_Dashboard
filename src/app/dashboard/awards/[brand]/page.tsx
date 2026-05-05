import { Suspense } from "react";
import AwardsBrandClient from "./AwardsBrandClient";
import PublicReferenceView from "@/src/components/PublicReferenceView";
import { findPublishedReference } from "@/lib/savedReferences";

interface AwardsBrandPageProps {
  params: { brand: string } | Promise<{ brand: string }>;
}

export default async function AwardsBrandPage({ params }: AwardsBrandPageProps) {
  const resolvedParams = await params;
  const { brand } = resolvedParams;

  const ref = await findPublishedReference("awards", brand);
  if (ref) {
    return <PublicReferenceView reference={ref} />;
  }

  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-white">Loading…</div>}>
      <AwardsBrandClient brand={brand} />
    </Suspense>
  );
}
