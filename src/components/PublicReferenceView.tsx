"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardControls from "@/src/components/DashboardControls";
import type { SavedReference } from "@/lib/savedReferencesShared";

const DEFAULT_REFRESH_MS = 30 * 60 * 1000;

const REFRESH_OPTIONS: { label: string; value: number }[] = [
  { label: "Off", value: 0 },
  { label: "1m", value: 60 * 1000 },
  { label: "5m", value: 5 * 60 * 1000 },
  { label: "15m", value: 15 * 60 * 1000 },
  { label: "30m", value: 30 * 60 * 1000 },
  { label: "1h", value: 60 * 60 * 1000 },
];

export default function PublicReferenceView({
  reference,
}: {
  reference: SavedReference;
}) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState<number>(reference.rowsPerPage);
  const [rotationMs, setRotationMs] = useState(0);
  const [refreshMs, setRefreshMs] = useState<number>(DEFAULT_REFRESH_MS);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const cancelledRef = useRef(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(
        `/api/public/references/${encodeURIComponent(reference.id)}/values`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      if (cancelledRef.current) return;
      setHeaders(data.headers ?? []);
      setRows(data.rows ?? []);
      setTruncated(Boolean(data.truncated));
      setError(null);
      setLastUpdated(Date.now());
    } catch (e) {
      if (!cancelledRef.current) setError((e as Error).message);
    } finally {
      if (!cancelledRef.current) {
        setRefreshing(false);
        setLoading(false);
      }
    }
  }, [reference.id]);

  // Initial load
  useEffect(() => {
    cancelledRef.current = false;
    load();
    return () => {
      cancelledRef.current = true;
    };
  }, [load]);

  // Auto-refresh on chosen interval
  useEffect(() => {
    if (refreshMs <= 0) return;
    const id = setInterval(load, refreshMs);
    return () => clearInterval(id);
  }, [load, refreshMs]);

  const visibleColumns = useMemo(
    () => reference.columns.filter((c) => c.visible),
    [reference.columns],
  );
  const columnIndexes = useMemo(
    () => visibleColumns.map((c) => headers.indexOf(c.source)),
    [visibleColumns, headers],
  );

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  useEffect(() => {
    setPageIndex(0);
  }, [pageSize]);
  useEffect(() => {
    if (totalPages <= 1 || rotationMs <= 0) return;
    const id = setInterval(() => {
      setPageIndex((p) => (p + 1) % totalPages);
    }, rotationMs);
    return () => clearInterval(id);
  }, [totalPages, rotationMs]);

  const currentPage = Math.min(pageIndex, totalPages - 1);
  const startIdx = currentPage * pageSize;
  const displayed = rows.slice(startIdx, startIdx + pageSize);
  const padCount = Math.max(0, pageSize - displayed.length);

  const isDark = reference.template === "dark";
  const primary = reference.primaryColor;

  const theme = useMemo(() => buildTheme(isDark, primary), [isDark, primary]);

  // Auto-fit row height + font sizes (rows + 1 for the header row)
  const rowCount = pageSize + 1;
  const effectiveCount = Math.min(rowCount, 14);
  const rowHeightVh = 88 / rowCount;
  const fontSize = `clamp(0.85rem, min(calc(0.7vw + ${8 / effectiveCount}vw), ${
    rowHeightVh * 0.5
  }vh), 3.5rem)`;
  const headerSize = `clamp(0.7rem, min(calc(0.45vw + ${5 / effectiveCount}vw), ${
    rowHeightVh * 0.35
  }vh), 2.4rem)`;
  const titleSize = `clamp(1.4rem, 3.2vw, 3rem)`;
  const subtitleSize = `clamp(0.7rem, 1.1vw, 1rem)`;

  if (error && rows.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-screen px-6 text-center"
        style={{ backgroundColor: theme.pageBg, color: theme.errorColor }}
      >
        Failed to load: {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-screen px-6"
        style={{ backgroundColor: theme.pageBg, color: theme.mutedText }}
      >
        Loading…
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-screen px-0 md:px-4 overflow-hidden"
      style={{ backgroundColor: theme.pageBg, color: theme.text }}
    >
      <header className="flex flex-col items-center text-center px-3 pt-4 pb-2">
        <h1
          className="font-bold uppercase"
          style={{
            color: primary,
            fontSize: titleSize,
            letterSpacing: "0.06em",
            textShadow: isDark
              ? `0 1px 3px rgba(0,0,0,0.6), 0 0 18px ${hexWithAlpha(primary, 0.35)}`
              : "none",
          }}
        >
          {reference.title}
        </h1>
        {refreshing && (
          <div
            className="mt-1"
            style={{ color: theme.mutedText, fontSize: subtitleSize }}
          >
            Refreshing…
          </div>
        )}
      </header>

      <div className="flex flex-col flex-1 min-h-0">
        <table
          className="w-full border-collapse table-fixed h-full"
          style={{ fontSize }}
        >
          <thead>
            <tr
              className="text-left font-semibold uppercase"
              style={{
                fontSize: headerSize,
                backgroundColor: theme.headerBg,
                color: theme.headerText,
                letterSpacing: "0.1em",
              }}
            >
              {visibleColumns.map((c, i) => (
                <th key={i} className="px-3 py-3">
                  {c.label || c.source}
                </th>
              ))}
            </tr>
            <tr>
              <td
                colSpan={Math.max(1, visibleColumns.length)}
                style={{
                  padding: 0,
                  height: "2px",
                  background: `linear-gradient(90deg, ${primary}, transparent)`,
                }}
              />
            </tr>
          </thead>
          <tbody>
            {displayed.map((row, idx) => (
              <tr
                key={idx}
                style={{
                  height: `${rowHeightVh}vh`,
                  minHeight: "40px",
                  background: idx % 2 === 0 ? theme.rowEven : theme.rowOdd,
                  color: theme.text,
                  borderBottom: `0.5px solid ${theme.rowBorder}`,
                }}
              >
                {columnIndexes.map((ci, vi) => (
                  <td
                    key={vi}
                    className="px-3 py-1 align-middle truncate"
                    title={ci >= 0 ? row[ci] ?? "" : ""}
                  >
                    {ci >= 0 ? row[ci] ?? "" : ""}
                  </td>
                ))}
                {visibleColumns.length === 0 && <td />}
              </tr>
            ))}
            {Array.from({ length: padCount }).map((_, i) => {
              const idx = displayed.length + i;
              return (
                <tr
                  key={`pad-${i}`}
                  style={{
                    height: `${rowHeightVh}vh`,
                    minHeight: "40px",
                    background: idx % 2 === 0 ? theme.rowEven : theme.rowOdd,
                    borderBottom: `0.5px solid ${theme.rowBorder}`,
                  }}
                >
                  <td colSpan={Math.max(1, visibleColumns.length)} />
                </tr>
              );
            })}
            {displayed.length === 0 && padCount === 0 && (
              <tr>
                <td
                  colSpan={Math.max(1, visibleColumns.length)}
                  className="px-3 py-10 text-center"
                  style={{ color: theme.mutedText }}
                >
                  No rows.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {truncated && (
        <div
          className="absolute top-2 right-2 text-xs rounded px-2 py-1"
          style={{
            color: "#92400e",
            backgroundColor: "#fef3c7",
            border: "1px solid #fde68a",
          }}
        >
          First 5,000 rows shown.
        </div>
      )}

      <DashboardControls>
        <button
          onClick={load}
          disabled={refreshing}
          className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {refreshing ? "Refreshing…" : "↻ Refresh"}
        </button>
        <button
          onClick={() => setPageIndex((p) => (p - 1 + totalPages) % totalPages)}
          disabled={totalPages <= 1}
          className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60 disabled:opacity-30"
        >
          ◀ Prev
        </button>
        <select
          value={String(pageSize)}
          onChange={(e) => setPageSize(Math.max(1, Number(e.target.value) || 10))}
          className="px-4 py-2 rounded bg-black/40 text-white [&>option]:bg-gray-800 [&>option]:text-white"
        >
          {[10, 15, 20, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
        <span className="text-sm text-white/80">
          {currentPage + 1} / {totalPages}
        </span>
        <button
          onClick={() => setPageIndex((p) => (p + 1) % totalPages)}
          disabled={totalPages <= 1}
          className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60 disabled:opacity-30"
        >
          Next ▶
        </button>
        <label className="flex items-center gap-1 text-xs text-white/80">
          Rotate
          <select
            value={rotationMs}
            onChange={(e) => setRotationMs(Number(e.target.value))}
            className="px-3 py-2 rounded bg-black/40 text-white [&>option]:bg-gray-800 [&>option]:text-white"
          >
            <option value="0">Off</option>
            <option value="5000">5s</option>
            <option value="10000">10s</option>
            <option value="15000">15s</option>
            <option value="30000">30s</option>
            <option value="60000">60s</option>
          </select>
        </label>
        <label className="flex items-center gap-1 text-xs text-white/80">
          Refresh
          <select
            value={refreshMs}
            onChange={(e) => setRefreshMs(Number(e.target.value))}
            className="px-3 py-2 rounded bg-black/40 text-white [&>option]:bg-gray-800 [&>option]:text-white"
          >
            {REFRESH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {lastUpdated && (
          <span className="text-xs text-white/70">
            Updated {new Date(lastUpdated).toLocaleTimeString()}
          </span>
        )}
        {reference.spreadsheetUrl && (
          <a
            href={reference.spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60"
          >
            Source ↗
          </a>
        )}
      </DashboardControls>
    </div>
  );
}

type Theme = {
  pageBg: string;
  text: string;
  mutedText: string;
  errorColor: string;
  headerBg: string;
  headerText: string;
  rowEven: string;
  rowOdd: string;
  rowBorder: string;
};

function buildTheme(isDark: boolean, primary: string): Theme {
  if (isDark) {
    return {
      pageBg: "#2a2a2a",
      text: "#ffffff",
      mutedText: "rgba(255,255,255,0.7)",
      errorColor: "#fca5a5",
      headerBg: "#3a3a3a",
      headerText: "rgba(255,255,255,0.9)",
      rowEven: "linear-gradient(90deg, #4A4A4A, #505050)",
      rowOdd: "linear-gradient(90deg, #73787C, #7A7F83)",
      rowBorder: "rgba(0,0,0,0.5)",
    };
  }
  return {
    pageBg: "#fafafa",
    text: "#1a1a1a",
    mutedText: "#6b7280",
    errorColor: "#b91c1c",
    headerBg: "#ffffff",
    headerText: "#111827",
    rowEven: "linear-gradient(90deg, #ffffff, #ffffff)",
    rowOdd: `linear-gradient(90deg, ${hexWithAlpha(primary, 0.05)}, ${hexWithAlpha(
      primary,
      0.08,
    )})`,
    rowBorder: hexWithAlpha(primary, 0.18),
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
