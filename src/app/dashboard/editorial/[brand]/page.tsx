import { Suspense } from "react";
import EditorialBrandClient from "./EditorialBrandClient";
import PublicReferenceView from "@/src/components/PublicReferenceView";
import { findPublishedReference } from "@/lib/savedReferences";

interface EditorialPageProps {
  params: { brand: string } | Promise<{ brand: string }>;
}

export default async function EditorialPage({ params }: EditorialPageProps) {
  const resolvedParams = await params;
  const { brand } = resolvedParams;

  const ref = await findPublishedReference("editorial", brand);
  if (ref) {
    return <PublicReferenceView reference={ref} />;
  }

  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading…</div>}>
      <EditorialBrandClient brand={brand} />
    </Suspense>
  );
}
