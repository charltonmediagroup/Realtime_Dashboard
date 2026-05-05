import { getCollection } from "@/lib/db";
import EditorialTeamEditor from "./RosterEditor";
import type { EditorialAccount } from "@/lib/editorialAccounts";

export const dynamic = "force-dynamic";

export default async function EditorialTeamPage() {
  const col = await getCollection<{ uid: string; data: unknown }>(
    "dashboard-config",
  );
  const [teamDoc, refsDoc] = await Promise.all([
    col.findOne({ uid: "editorial-roster" }),
    col.findOne({ uid: "admin-references" }),
  ]);
  const initial = (Array.isArray(teamDoc?.data) ? teamDoc!.data : []) as EditorialAccount[];
  const refs = (refsDoc?.data && typeof refsDoc.data === "object"
    ? refsDoc.data
    : {}) as Record<string, string>;
  const referenceUrl = typeof refs.editorialTeam === "string" ? refs.editorialTeam : "";
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold mb-1">Editorial team</h1>
      <p className="text-sm text-neutral-600 mb-6">
        Members shown on the editorial leaderboard.
      </p>
      <EditorialTeamEditor initial={initial} initialReferenceUrl={referenceUrl} />
    </div>
  );
}
