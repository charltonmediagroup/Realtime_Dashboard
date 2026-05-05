import Link from "next/link";
import { notFound } from "next/navigation";
import { getSavedReference, listSavedReferences } from "@/lib/savedReferences";
import ReferenceViewClient from "./ReferenceViewClient";

export const dynamic = "force-dynamic";

export default async function ReferenceViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ref = await getSavedReference(id);
  if (!ref) notFound();
  const all = await listSavedReferences();
  return (
    <div className="max-w-6xl">
      <div className="text-sm text-neutral-500 mb-2">
        <Link href="/admin/references" className="hover:underline">
          ← References
        </Link>
      </div>
      <ReferenceViewClient initialRef={ref} allRefs={all} />
    </div>
  );
}
