import Link from "next/link";
import { getCollection } from "@/lib/db";
import BrandsListClient from "./BrandsListClient";

export const dynamic = "force-dynamic";

type BrandEntry = {
  name?: string;
  image?: string;
  group?: string;
  url?: string;
  editorial?: boolean;
  awards?: boolean;
  events?: boolean;
};

export default async function BrandsPage() {
  const col = await getCollection<{
    uid: string;
    data: Record<string, BrandEntry>;
  }>("dashboard-config");
  const doc = await col.findOne({ uid: "brand-all-properties" });
  const data = (doc?.data && typeof doc.data === "object" ? doc.data : {}) as Record<
    string,
    BrandEntry
  >;
  return (
    <div className="max-w-4xl">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-2xl font-semibold">Brands</h1>
        <Link
          href="/admin/brands/_new"
          className="text-sm text-blue-700 hover:underline"
        >
          + Add brand
        </Link>
      </div>
      <p className="text-sm text-neutral-600 mb-6">
        Per-brand site configuration in
        <code className="mx-1 px-1 bg-neutral-100 rounded text-xs">
          dashboard-config / brand-all-properties
        </code>
        .
      </p>
      <BrandsListClient initial={data} />
    </div>
  );
}
