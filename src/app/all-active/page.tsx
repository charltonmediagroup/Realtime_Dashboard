"use client";

import { div } from "framer-motion/client";
import React, { useEffect, useState } from "react";

type BrandStats = {
  now: number | null;
  today: number | null;
  "30": number | null;
  "365": number | null;
};

type BrandRow = {
  brand: string;
  stats: BrandStats;
};

const API_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "";

// Parse brand properties from env
const BRAND_PROPERTIES: Record<string, { name: string }> = (() => {
  try {
    return JSON.parse(process.env.NEXT_PUBLIC_BRAND_PROPERTIES_JSON ?? "{}");
  } catch {
    return {};
  }
})();

// Sorting parameters
function getSortParams(): { sortBy: keyof BrandStats | "name"; sortAsc: boolean } {
  if (typeof window === "undefined") return { sortBy: "name", sortAsc: true };
  const params = new URLSearchParams(window.location.search);
  const sort = (params.get("sort") as keyof BrandStats | "name" | null) ?? "name";
  const order = (params.get("order") ?? "asc").toLowerCase();
  return { sortBy: sort, sortAsc: order === "asc" };
}

// Determine table mode
function getTableMode(): boolean {
  if (typeof window === "undefined") return true;
  const params = new URLSearchParams(window.location.search);
  const tableParam = params.get("table");
  const isSmallScreen = window.innerWidth < 768; // Mobile breakpoint
  return tableParam !== "0" && tableParam !== "false" && !isSmallScreen;
}

export default function AllStatsPage() {
  const [rows, setRows] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMode, setTableMode] = useState(getTableMode());

  const { sortBy, sortAsc } = getSortParams();

  async function fetchAllStats() {
    try {
      const res = await fetch(`${API_BASE}/api/all/active`, { cache: "no-store" });
      if (!res.ok) return;

      const data = await res.json();
      const newRows: BrandRow[] = [];

      for (const brand of Object.keys(data.data)) {
        const stats = data.data[brand];
        newRows.push({
          brand,
          stats: {
            now: stats.now ?? null,
            today: stats.today ?? null,
            "30": stats["30"] ?? null,
            "365": stats["365"] ?? null,
          },
        });
      }

      setRows(newRows);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch brand stats", err);
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllStats();

    const intervals: number[] = [];
    intervals.push(window.setInterval(() => fetchAllStats(), 60_000));
    intervals.push(window.setInterval(() => fetchAllStats(), 5 * 60_000));
    intervals.push(window.setInterval(() => fetchAllStats(), 30 * 60_000));

    // Update tableMode on resize
    const handleResize = () => setTableMode(getTableMode());
    window.addEventListener("resize", handleResize);

    return () => {
      intervals.forEach(clearInterval);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  function getBrandName(code: string) {
    const name = BRAND_PROPERTIES[code]?.name;
    return name ?? code.toUpperCase();
  }

  // Compute totals
  const totals: BrandStats = rows.reduce(
    (acc, row) => {
      acc.now = (acc.now ?? 0) + (row.stats.now ?? 0);
      acc.today = (acc.today ?? 0) + (row.stats.today ?? 0);
      acc["30"] = (acc["30"] ?? 0) + (row.stats["30"] ?? 0);
      acc["365"] = (acc["365"] ?? 0) + (row.stats["365"] ?? 0);
      return acc;
    },
    { now: 0, today: 0, "30": 0, "365": 0 }
  );

  // Sort rows
  const sortedRows = [...rows].sort((a, b) => {
    if (sortBy === "name") {
      const nameA = getBrandName(a.brand).toLowerCase();
      const nameB = getBrandName(b.brand).toLowerCase();
      return sortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    } else {
      const valA = a.stats[sortBy] ?? 0;
      const valB = b.stats[sortBy] ?? 0;
      return sortAsc ? valA - valB : valB - valA;
    }
  });

  return (
    <div className="bg-white text-gray-800 min-h-screen flex flex-col gap-2 items-center justify-evenly px-10 py-2 w-full">
      {loading ? (
        <p>Loading data...</p>
      ) : rows.length === 0 ? (
        <p>No data available.</p>
      ) : (
        <>
          <p className="text-3xl font-bold m-4 capitalize">Websites Users</p>

          {/* Totals */}
          <div className="flex flex-wrap justify-between w-full px-8 gap-4">
            <Metric label="Total Last 365 Days" value={totals["365"]} />
            <Metric label="Total Last 30 Days" value={totals["30"]} />
            <Metric label="Total Today" value={totals.today} />
            <Metric label="Total Now" value={totals.now} />
          </div>

          {tableMode ? (
            // Table Mode
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th style={th}>Publication</th>
                  <th style={th}>Last 365 Days</th>
                  <th style={th}>Last 30 Days</th>
                  <th style={th}>Today</th>
                  <th style={th}>Now</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr key={row.brand}>
                    <td style={td}>{getBrandName(row.brand)}</td>
                    <td style={td}>{row.stats["365"]?.toLocaleString() ?? "—"}</td>
                    <td style={td}>{row.stats["30"]?.toLocaleString() ?? "—"}</td>
                    <td style={td}>{row.stats.today?.toLocaleString() ?? "—"}</td>
                    <td style={td}>{row.stats.now?.toLocaleString() ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            // Card / Mobile Mode
            <div className="w-full flex flex-col items-center justify-center gap-4">
              {sortedRows.map((row) => (
                <div
                  key={row.brand}
                  className="p-4 border text-gray-600 max-w-2xl w-full flex flex-col items-center border-gray-400 rounded shadow-sm bg-gray-50"
                >
                  <div className="font-bold text-lg mb-2 text-gray-800">{getBrandName(row.brand)}</div>
                  <div>Now: <span className="font-bold text-gray-800">{row.stats.now?.toLocaleString() ?? "—"}</span></div>
                  <div>Today: <span className="font-bold text-gray-800">{row.stats.today?.toLocaleString() ?? "—"}</span></div>
                  <div>Last 30 Days: <span className="font-bold text-gray-800">{row.stats["30"]?.toLocaleString() ?? "—"}</span></div>
                  <div>Last 365 Days: <span className="font-bold text-gray-800">{row.stats["365"]?.toLocaleString() ?? "—"}</span></div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex-1 text-center p-2">
      <div className="text-2xl font-bold">{value?.toLocaleString() ?? "—"}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

const th: React.CSSProperties = {
  borderBottom: "1px solid #cccccc43",
  textAlign: "left",
  padding: "8px",
};

const td: React.CSSProperties = {
  padding: "1px",
  borderBottom: "1px solid #cccccc43",
  fontSize: "1rem",
};

