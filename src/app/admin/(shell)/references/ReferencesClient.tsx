"use client";

import { useState } from "react";

type Status = { kind: "ok" | "err"; message: string } | null;

export default function ReferencesClient({
  initialEditorialTeam,
}: {
  initialEditorialTeam: string;
}) {
  const [editorialTeam, setEditorialTeam] = useState(initialEditorialTeam);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setStatus(null);
    try {
      const trimmed = editorialTeam.trim();
      if (trimmed && !/^https?:\/\//i.test(trimmed)) {
        throw new Error("URL must start with http:// or https://");
      }
      const get = await fetch(
        "/api/json-provider/dashboard-config/admin-references?cache=false",
      );
      const existing =
        get.ok ? ((await get.json()) as Record<string, unknown>) : {};
      const next =
        existing && typeof existing === "object" && !Array.isArray(existing)
          ? { ...(existing as Record<string, unknown>) }
          : {};
      if (trimmed) next.editorialTeam = trimmed;
      else delete next.editorialTeam;

      const res = await fetch(
        "/api/json-provider/dashboard-config/admin-references",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setEditorialTeam(trimmed);
      setStatus({ kind: "ok", message: trimmed ? "Saved." : "Cleared." });
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-neutral-200 rounded bg-white p-4">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-medium">Editorial team</span>
        {editorialTeam && (
          <a
            href={editorialTeam}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-700 hover:underline"
          >
            Open ↗
          </a>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="url"
          value={editorialTeam}
          onChange={(e) => setEditorialTeam(e.target.value)}
          placeholder="https://docs.google.com/…"
          className="flex-1 min-w-[280px] border border-neutral-300 rounded px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="px-3 py-1.5 text-sm border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {status && (
          <span
            className={`text-xs ${
              status.kind === "ok" ? "text-green-700" : "text-red-700"
            }`}
          >
            {status.message}
          </span>
        )}
      </div>
    </div>
  );
}
