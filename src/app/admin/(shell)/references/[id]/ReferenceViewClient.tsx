"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SavedReference } from "@/lib/savedReferencesShared";
import ReferenceBuilder from "../ReferenceBuilder";

type Status = { kind: "ok" | "err"; message: string } | null;

export default function ReferenceViewClient({
  initialRef,
  allRefs,
}: {
  initialRef: SavedReference;
  allRefs: SavedReference[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [page, setPage] = useState(0);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    if (editing) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setStatus(null);
      try {
        const res = await fetch(
          `/api/admin/sheets/values?id=${encodeURIComponent(
            initialRef.spreadsheetId,
          )}&tab=${encodeURIComponent(initialRef.tabName)}`,
          { cache: "no-store" },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        if (cancelled) return;
        setHeaders(data.headers ?? []);
        setRows(data.rows ?? []);
        setTruncated(Boolean(data.truncated));
        setPage(0);
      } catch (e) {
        if (!cancelled)
          setStatus({ kind: "err", message: (e as Error).message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    editing,
    initialRef.spreadsheetId,
    initialRef.tabName,
    initialRef.updatedAt,
  ]);

  const visibleColumns = useMemo(
    () => initialRef.columns.filter((c) => c.visible),
    [initialRef.columns],
  );

  const columnIndexes = useMemo(() => {
    return visibleColumns.map((c) => headers.indexOf(c.source));
  }, [visibleColumns, headers]);

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / initialRef.rowsPerPage));
  const pageRows = rows.slice(
    page * initialRef.rowsPerPage,
    (page + 1) * initialRef.rowsPerPage,
  );

  async function deleteRef() {
    if (!confirm(`Delete reference "${initialRef.title}"?`)) return;
    const next = allRefs.filter((r) => r.id !== initialRef.id);
    try {
      const res = await fetch(
        "/api/json-provider/dashboard-config/saved-references",
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
      router.replace("/admin/references");
      router.refresh();
    } catch (e) {
      setStatus({ kind: "err", message: (e as Error).message });
    }
  }

  if (editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Edit reference</h1>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-sm text-neutral-600 hover:underline"
          >
            Cancel
          </button>
        </div>
        <ReferenceBuilder
          mode="edit"
          existingIds={allRefs.map((r) => r.id)}
          existingList={allRefs}
          initial={initialRef}
        />
      </div>
    );
  }

  const t = templateClasses(initialRef);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1">
        <h1 className="text-2xl font-semibold">{initialRef.title}</h1>
        <div className="flex items-center gap-3 text-sm">
          <a
            href={initialRef.spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 hover:underline"
          >
            Open sheet ↗
          </a>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-blue-700 hover:underline"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={deleteRef}
            className="text-red-600 hover:underline"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="text-xs text-neutral-500 mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          Tab: <span className="font-mono">{initialRef.tabName}</span>
        </span>
        <span>· Template: {initialRef.template}</span>
        <span>· Rows per page: {initialRef.rowsPerPage}</span>
        {initialRef.published ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border border-green-200 bg-green-50 text-green-800">
            Published ·{" "}
            <a
              href={`/dashboard${
                initialRef.publishParent ? "/" + initialRef.publishParent : ""
              }/${initialRef.publishSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              /dashboard
              {initialRef.publishParent ? `/${initialRef.publishParent}` : ""}/
              {initialRef.publishSlug}
            </a>
          </span>
        ) : (
          <span className="text-neutral-400">· Not published</span>
        )}
      </div>

      {status && (
        <div className="mb-3 text-sm text-red-700 border border-red-200 bg-red-50 rounded px-3 py-2">
          {status.message}
        </div>
      )}

      {loading && (
        <div className="text-sm text-neutral-500 mb-2">Loading sheet…</div>
      )}

      {truncated && (
        <div className="mb-2 text-xs text-amber-700 border border-amber-200 bg-amber-50 rounded px-3 py-1.5">
          Showing the first 5,000 rows. The sheet has more.
        </div>
      )}

      {!loading && (
        <div
          className={`overflow-x-auto rounded ${t.wrapper}`}
          style={t.wrapperStyle}
        >
          <table className={`min-w-full text-sm ${t.table}`}>
            <thead className={t.thead} style={t.theadStyle}>
              <tr>
                {visibleColumns.map((c, i) => (
                  <th
                    key={`${c.source}-${i}`}
                    className="px-3 py-2 text-left whitespace-nowrap"
                  >
                    {c.label || c.source}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, ri) => (
                <tr
                  key={ri}
                  className={rowClass(initialRef.template)}
                  style={rowStyle(initialRef, ri)}
                >
                  {columnIndexes.map((ci, vi) => (
                    <td key={vi} className="px-3 py-1.5 align-top">
                      {ci >= 0 ? row[ci] ?? "" : ""}
                    </td>
                  ))}
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td
                    colSpan={Math.max(1, visibleColumns.length)}
                    className="px-3 py-6 text-center text-neutral-400"
                  >
                    No rows.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalRows > initialRef.rowsPerPage && (
        <div className="mt-3 flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-2 py-1 border border-neutral-300 rounded disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-neutral-600">
            Page {page + 1} of {totalPages} · {totalRows} rows
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-2 py-1 border border-neutral-300 rounded disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function templateClasses(ref: SavedReference) {
  if (ref.template === "dark") {
    return {
      wrapper: "border border-neutral-800 bg-neutral-900",
      wrapperStyle: undefined as React.CSSProperties | undefined,
      table: "text-neutral-100",
      thead: "border-b text-white",
      theadStyle: { backgroundColor: ref.primaryColor },
    };
  }
  return {
    wrapper: "border bg-white",
    wrapperStyle: { borderColor: hexWithAlpha(ref.primaryColor, 0.3) },
    table: "",
    thead: "border-b text-white",
    theadStyle: { backgroundColor: ref.primaryColor },
  };
}

function rowClass(template: SavedReference["template"]): string {
  if (template === "dark") return "border-t border-neutral-800";
  return "border-t";
}

function rowStyle(ref: SavedReference, i: number): React.CSSProperties | undefined {
  if (ref.template === "dark") {
    return {
      backgroundColor:
        i % 2 === 0 ? "rgba(255,255,255,0.02)" : hexWithAlpha(ref.primaryColor, 0.12),
    };
  }
  return {
    borderTopColor: hexWithAlpha(ref.primaryColor, 0.15),
    backgroundColor: i % 2 === 0 ? "#fff" : hexWithAlpha(ref.primaryColor, 0.08),
  };
}

function hexWithAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
