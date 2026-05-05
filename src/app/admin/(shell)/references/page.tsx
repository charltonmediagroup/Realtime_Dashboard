import Link from "next/link";
import { getCollection } from "@/lib/db";
import { LEADERBOARD_SHEETS } from "@/lib/leaderboardSources";
import { listSavedReferences } from "@/lib/savedReferences";
import ReferencesClient from "./ReferencesClient";

export const dynamic = "force-dynamic";

export default async function ReferencesPage() {
  const col = await getCollection<{ uid: string; data: unknown }>("dashboard-config");
  const refsDoc = await col.findOne({ uid: "admin-references" });
  const refs = (refsDoc?.data && typeof refsDoc.data === "object"
    ? refsDoc.data
    : {}) as Record<string, string>;
  const editorialTeam = typeof refs.editorialTeam === "string" ? refs.editorialTeam : "";

  const saved = await listSavedReferences();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">References</h1>
      <p className="text-sm text-neutral-600 mb-6">
        Source documents that feed the dashboards, plus any custom Google Sheet
        views you save here.
      </p>

      <section className="mb-8">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-sm font-semibold text-neutral-700">Custom references</h2>
          <Link
            href="/admin/references/new"
            className="text-sm text-blue-700 hover:underline"
          >
            + Add reference
          </Link>
        </div>
        <p className="text-xs text-neutral-500 mb-3">
          Pull a Google Sheet tab into the admin with your own column selection
          and styling.
        </p>
        {saved.length === 0 ? (
          <div className="border border-dashed border-neutral-300 rounded bg-white px-4 py-6 text-center text-sm text-neutral-500">
            No custom references yet.{" "}
            <Link href="/admin/references/new" className="text-blue-700 hover:underline">
              Add one
            </Link>
            .
          </div>
        ) : (
          <div className="border border-neutral-200 rounded bg-white divide-y divide-neutral-100">
            {saved.map((r) => (
              <Link
                key={r.id}
                href={`/admin/references/${encodeURIComponent(r.id)}`}
                className="block px-4 py-3 hover:bg-neutral-50"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">{r.title}</span>
                  <span className="text-xs text-neutral-400 font-mono">{r.id}</span>
                </div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  Tab: <span className="font-mono">{r.tabName}</span> ·{" "}
                  {r.columns.filter((c) => c.visible).length} of {r.columns.length}{" "}
                  columns · {r.template}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-neutral-700 mb-2">
          Leaderboard data sources
        </h2>
        <p className="text-xs text-neutral-500 mb-3">
          Read-only. The Awards and Bizzcon leaderboards pull live data from these
          Google Sheets via the Sheets API.
        </p>
        <div className="border border-neutral-200 rounded bg-white divide-y divide-neutral-100">
          {LEADERBOARD_SHEETS.map((s) => (
            <div
              key={s.spreadsheetId}
              className="px-4 py-3 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">{s.label}</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {s.tabName ? (
                    <>
                      Tab: <span className="font-mono">{s.tabName}</span>
                    </>
                  ) : s.gid !== undefined ? (
                    <>
                      Sheet GID: <span className="font-mono">{s.gid}</span>
                    </>
                  ) : null}
                </div>
                <div className="text-xs text-neutral-400 mt-0.5 font-mono truncate">
                  {s.spreadsheetId}
                </div>
              </div>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 self-center text-sm text-blue-700 hover:underline"
              >
                Open ↗
              </a>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-neutral-700 mb-2">
          Editorial team reference
        </h2>
        <p className="text-xs text-neutral-500 mb-3">
          Optional Google Doc / Sheet linked from the Editorial team admin page.
        </p>
        <ReferencesClient initialEditorialTeam={editorialTeam} />
      </section>
    </div>
  );
}
