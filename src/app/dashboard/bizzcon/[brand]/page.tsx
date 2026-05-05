import BizzconBrandClient from "./BizzconBrandClient";
import PublicReferenceView from "@/src/components/PublicReferenceView";
import { findPublishedReference } from "@/lib/savedReferences";

interface PageProps {
  params: { brand: string } | Promise<{ brand: string }>;
}

export default async function BizzconBrandPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { brand } = resolvedParams;

  const ref = await findPublishedReference("bizzcon", brand);
  if (ref) {
    return <PublicReferenceView reference={ref} />;
  }

  return <BizzconBrandClient />;
}
