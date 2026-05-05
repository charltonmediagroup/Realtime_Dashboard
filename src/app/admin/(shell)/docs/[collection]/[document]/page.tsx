import Link from "next/link";
import { getCollection } from "@/lib/db";
import DocEditorClient from "./DocEditorClient";

export const dynamic = "force-dynamic";

const CACHE_DOCS = new Set([
  "awards-brand-cache",
  "events-brand-cache",
  "videos-library",
]);

export default async function DocEditorPage({
  params,
}: {
  params: Promise<{ collection: string; document: string }>;
}) {
  const { collection, document } = await params;
  const col = await getCollection(collection);
  const doc = await col.findOne<{ uid: string; data: unknown }>({ uid: document });
  const value = doc?.data ?? {};
  const isCacheDoc = collection === "dashboard-config" && CACHE_DOCS.has(document);

  return (
    <div className="max-w-4xl">
      <div className="text-sm text-neutral-500 mb-2">
        <Link href="/admin/docs" className="hover:underline">
          Collections
        </Link>
        <span className="mx-1">/</span>
        <Link
          href={`/admin/docs/${encodeURIComponent(collection)}`}
          className="hover:underline font-mono"
        >
          {collection}
        </Link>
      </div>
      <h1 className="text-2xl font-semibold mb-4 font-mono">{document}</h1>
      <DocEditorClient
        collection={collection}
        document={document}
        initialJson={JSON.stringify(value, null, 2)}
        isCacheDoc={isCacheDoc}
      />
    </div>
  );
}
