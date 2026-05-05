import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollection } from "@/lib/db";
import BrandFormClient from "./BrandFormClient";

export const dynamic = "force-dynamic";

type BrandEntry = Record<string, unknown>;

export default async function BrandEditPage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand } = await params;
  const isNew = brand === "_new";
  const col = await getCollection<{ uid: string; data: Record<string, BrandEntry> }>(
    "dashboard-config",
  );
  const doc = await col.findOne({ uid: "brand-all-properties" });
  const all = (doc?.data && typeof doc.data === "object" ? doc.data : {}) as Record<
    string,
    BrandEntry
  >;

  if (!isNew && !(brand in all)) {
    notFound();
  }
  const entry = isNew ? {} : all[brand];

  return (
    <div className="max-w-3xl">
      <div className="text-sm text-neutral-500 mb-2">
        <Link href="/admin/brands" className="hover:underline">
          ← Back to brands
        </Link>
      </div>
      <h1 className="text-2xl font-semibold mb-4">
        {isNew ? "New brand" : `Brand: ${brand}`}
      </h1>
      <BrandFormClient
        isNew={isNew}
        initialCode={isNew ? "" : brand}
        initialEntry={entry}
        existingCodes={Object.keys(all)}
        allEntries={all}
      />
    </div>
  );
}
