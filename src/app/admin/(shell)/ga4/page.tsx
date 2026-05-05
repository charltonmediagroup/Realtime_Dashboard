import { getCollection } from "@/lib/db";
import Ga4PropertiesEditor from "./Ga4PropertiesEditor";

export const dynamic = "force-dynamic";

export default async function Ga4Page() {
  const col = await getCollection<{ uid: string; data: Record<string, string> }>(
    "dashboard-config",
  );
  const doc = await col.findOne({ uid: "brand-ga4-properties" });
  const data = (doc?.data && typeof doc.data === "object" ? doc.data : {}) as Record<
    string,
    string
  >;
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">GA4 properties</h1>
      <p className="text-sm text-neutral-600 mb-6">
        Maps each brand code to its GA4 property ID. Stored in
        <code className="mx-1 px-1 bg-neutral-100 rounded text-xs">
          dashboard-config / brand-ga4-properties
        </code>
        .
      </p>
      <Ga4PropertiesEditor initial={data} />
    </div>
  );
}
