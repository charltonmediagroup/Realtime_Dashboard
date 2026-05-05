import Link from "next/link";
import { getCollection } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DocsListPage({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params;
  const col = await getCollection(collection);
  const uidsRaw = (await col.distinct("uid")) as unknown[];
  const uids = uidsRaw
    .filter((u): u is string => typeof u === "string")
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className="max-w-3xl">
      <div className="text-sm text-neutral-500 mb-2">
        <Link href="/admin/docs" className="hover:underline">
          ← Collections
        </Link>
      </div>
      <h1 className="text-2xl font-semibold mb-1 font-mono">{collection}</h1>
      <p className="text-sm text-neutral-600 mb-6">
        {uids.length} document{uids.length === 1 ? "" : "s"} with a
        <code className="mx-1 px-1 bg-neutral-100 rounded text-xs">uid</code>
        field.
      </p>
      <div className="border border-neutral-200 rounded bg-white divide-y divide-neutral-100">
        {uids.map((uid) => (
          <Link
            key={uid}
            href={`/admin/docs/${encodeURIComponent(collection)}/${encodeURIComponent(uid)}`}
            className="block px-4 py-2 font-mono text-sm hover:bg-neutral-50 text-blue-700"
          >
            {uid}
          </Link>
        ))}
        {uids.length === 0 && (
          <div className="px-4 py-6 text-center text-neutral-400 text-sm">
            No documents with a uid field.
          </div>
        )}
      </div>
    </div>
  );
}
