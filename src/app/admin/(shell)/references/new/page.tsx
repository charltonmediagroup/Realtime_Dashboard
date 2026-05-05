import Link from "next/link";
import { listSavedReferences } from "@/lib/savedReferences";
import ReferenceBuilder from "../ReferenceBuilder";

export const dynamic = "force-dynamic";

export default async function NewReferencePage() {
  const existing = await listSavedReferences();
  return (
    <div className="max-w-4xl">
      <div className="text-sm text-neutral-500 mb-2">
        <Link href="/admin/references" className="hover:underline">
          ← References
        </Link>
      </div>
      <h1 className="text-2xl font-semibold mb-4">Add reference</h1>
      <ReferenceBuilder
        mode="new"
        existingIds={existing.map((r) => r.id)}
        existingList={existing}
      />
    </div>
  );
}
