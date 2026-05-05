"use client";

import { useState } from "react";
import type { EditorialAccount } from "@/lib/editorialAccounts";

const ROLES = ["Managing editor", "Editor", "Reporter"] as const;

type Status = { kind: "ok" | "err"; message: string } | null;

export default function EditorialTeamEditor({
  initial,
  initialReferenceUrl,
}: {
  initial: EditorialAccount[];
  initialReferenceUrl: string;
}) {
  const [rows, setRows] = useState<EditorialAccount[]>(initial);
  const [referenceUrl, setReferenceUrl] = useState(initialReferenceUrl);
  const [referenceStatus, setReferenceStatus] = useState<Status>(null);
  const [referenceBusy, setReferenceBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  async function saveReference() {
    setReferenceBusy(true);
    setReferenceStatus(null);
    try {
      const trimmed = referenceUrl.trim();
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
      if (trimmed) {
        next.editorialTeam = trimmed;
      } else {
        delete next.editorialTeam;
      }
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
      setReferenceUrl(trimmed);
      setReferenceStatus({ kind: "ok", message: trimmed ? "Saved." : "Cleared." });
    } catch (e) {
      setReferenceStatus({ kind: "err", message: (e as Error).message });
    } finally {
      setReferenceBusy(false);
    }
  }

  function update(i: number, patch: Partial<EditorialAccount>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function remove(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
  }
  function addRow() {
    setRows((rs) => [...rs, { name: "", role: "Editor", username: "" }]);
  }
  function move(i: number, dir: -1 | 1) {
    setRows((rs) => {
      const j = i + dir;
      if (j < 0 || j >= rs.length) return rs;
      const out = rs.slice();
      [out[i], out[j]] = [out[j], out[i]];
      return out;
    });
  }

  async function save() {
    setBusy(true);
    setStatus(null);
    try {
      const cleaned = rows
        .map((r) => ({
          name: r.name.trim(),
          role: r.role.trim(),
          username: r.username.trim(),
        }))
        .filter((r) => r.name || r.username);
      const res = await fetch(
        "/api/json-provider/dashboard-config/editorial-roster",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleaned),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setRows(cleaned);
      setStatus({ kind: "ok", message: `Saved ${cleaned.length} entries.` });
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <section className="mb-5 border border-neutral-200 rounded bg-white p-4">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-sm font-semibold">Reference document</h2>
          {referenceUrl && (
            <a
              href={referenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-700 hover:underline"
            >
              Open ↗
            </a>
          )}
        </div>
        <p className="text-xs text-neutral-500 mb-2">
          Source-of-truth Google Doc / Sheet for this team list. Shown for reference only.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="url"
            value={referenceUrl}
            onChange={(e) => setReferenceUrl(e.target.value)}
            placeholder="https://docs.google.com/…"
            className="flex-1 min-w-[280px] border border-neutral-300 rounded px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={saveReference}
            disabled={referenceBusy}
            className="px-3 py-1.5 text-sm border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-50"
          >
            {referenceBusy ? "Saving…" : "Save link"}
          </button>
          {referenceStatus && (
            <span
              className={`text-xs ${
                referenceStatus.kind === "ok" ? "text-green-700" : "text-red-700"
              }`}
            >
              {referenceStatus.message}
            </span>
          )}
        </div>
      </section>

      <div className="overflow-x-auto border border-neutral-200 rounded bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-2 py-2 text-left w-10">#</th>
              <th className="px-2 py-2 text-left">Name</th>
              <th className="px-2 py-2 text-left w-44">Role</th>
              <th className="px-2 py-2 text-left">Username / email</th>
              <th className="px-2 py-2 text-right w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-neutral-100">
                <td className="px-2 py-1 text-neutral-400">{i + 1}</td>
                <td className="px-2 py-1">
                  <input
                    value={r.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    className="w-full border border-neutral-200 rounded px-2 py-1"
                  />
                </td>
                <td className="px-2 py-1">
                  <select
                    value={r.role}
                    onChange={(e) => update(i, { role: e.target.value })}
                    className="w-full border border-neutral-200 rounded px-2 py-1 bg-white"
                  >
                    {ROLES.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                    {!ROLES.includes(r.role as (typeof ROLES)[number]) && (
                      <option value={r.role}>{r.role}</option>
                    )}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <input
                    value={r.username}
                    onChange={(e) => update(i, { username: e.target.value })}
                    className="w-full border border-neutral-200 rounded px-2 py-1 font-mono text-xs"
                  />
                </td>
                <td className="px-2 py-1 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="px-1 text-neutral-500 hover:text-neutral-900 disabled:opacity-30"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === rows.length - 1}
                    className="px-1 text-neutral-500 hover:text-neutral-900 disabled:opacity-30"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="ml-2 text-red-600 hover:text-red-800 text-xs"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-neutral-400">
                  No entries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={addRow}
          className="px-3 py-1.5 text-sm border border-neutral-300 rounded hover:bg-neutral-50"
        >
          + Add row
        </button>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="px-3 py-1.5 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {status && (
          <span
            className={`text-sm ${
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
