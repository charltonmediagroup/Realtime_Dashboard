import { Suspense } from "react";
import BrandPageClient from "./BrandClient";
import PublicReferenceView from "@/src/components/PublicReferenceView";
import { findPublishedReference } from "@/lib/savedReferences";

interface PageProps {
  params: { brand: string } | Promise<{ brand: string }>;
}

export default async function BrandPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { brand } = resolvedParams;

  const ref = await findPublishedReference("", brand);
  if (ref) {
    return <PublicReferenceView reference={ref} />;
  }

  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading…</div>}>
      <BrandPageClient brand={brand} />
    </Suspense>
  );
}
