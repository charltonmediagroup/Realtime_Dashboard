"use client";

import { useState } from "react";

type Status = { kind: "ok" | "err"; message: string } | null;
type Row = { code: string; id: string };

export default function Ga4PropertiesEditor({
  initial,
}: {
  initial: Record<string, string>;
}) {
  const [rows, setRows] = useState<Row[]>(
    Object.entries(initial)
      .map(([code, id]) => ({ code, id: String(id ?? "") }))
      .sort((a, b) => a.code.localeCompare(b.code)),
  );
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  function update(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function remove(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
  }
  function add() {
    setRows((rs) => [...rs, { code: "", id: "" }]);
  }

  async function save() {
    setStatus(null);
    const out: Record<string, string> = {};
    for (const r of rows) {
      const code = r.code.trim();
      const id = r.id.trim();
      if (!code) continue;
      if (out[code]) {
        setStatus({ kind: "err", message: `Duplicate code: ${code}` });
        return;
      }
      out[code] = id;
    }
    setBusy(true);
    try {
      const res = await fetch(
        "/api/json-provider/dashboard-config/brand-ga4-properties",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(out),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setStatus({ kind: "ok", message: `Saved ${Object.keys(out).length} mappings.` });
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="border border-neutral-200 rounded bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-3 py-2 text-left w-1/3">Brand code</th>
              <th className="px-3 py-2 text-left">GA4 property ID</th>
              <th className="px-3 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-neutral-100">
                <td className="px-2 py-1">
                  <input
                    value={r.code}
                    onChange={(e) => update(i, { code: e.target.value })}
                    className="w-full border border-neutral-200 rounded px-2 py-1 font-mono text-xs"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    value={r.id}
                    onChange={(e) => update(i, { id: e.target.value })}
                    className="w-full border border-neutral-200 rounded px-2 py-1 font-mono text-xs"
                  />
                </td>
                <td className="px-2 py-1 text-right">
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-neutral-400">
                  No mappings.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={add}
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
