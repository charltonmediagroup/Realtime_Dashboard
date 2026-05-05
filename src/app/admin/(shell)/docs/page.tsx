import Link from "next/link";
import { getAdapter } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DocsCollectionsPage() {
  const adapter = await getAdapter();
  const names = await adapter.listCollectionNames();
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">Docs (raw)</h1>
      <p className="text-sm text-neutral-600 mb-6">
        Browse and edit any document by UID. For typed editors use the dedicated
        sections in the sidebar.
      </p>
      <div className="border border-neutral-200 rounded bg-white divide-y divide-neutral-100">
        {names.map((n) => (
          <Link
            key={n}
            href={`/admin/docs/${encodeURIComponent(n)}`}
            className="block px-4 py-2 font-mono text-sm hover:bg-neutral-50 text-blue-700"
          >
            {n}
          </Link>
        ))}
        {names.length === 0 && (
          <div className="px-4 py-6 text-center text-neutral-400 text-sm">
            No collections.
          </div>
        )}
      </div>
    </div>
  );
}
