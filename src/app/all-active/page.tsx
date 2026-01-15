"use client";

import React, { useEffect, useState } from "react";
import BRAND_PROPERTIES_RAW from "@/data/brand_properties.json";
import GROUPS_RAW from "@/data/groups.json";

type BrandStats = {
  now: number | null;
  today: number | null;
  "30": number | null;
  "365": number | null;
};

type BrandRow = {
  brand: string;          // brand code or group code when grouped
  stats: BrandStats;
  group?: string;         // key of group in GROUPS
};

interface BrandInfo {
  name: string;
  ga4_filter?: any;
  group?: string;
  image?: string;
}

interface BrandProperties {
  [key: string]: BrandInfo;
}

interface GroupInfo {
  name: string;
  main: string;
}

const BRAND_PROPERTIES: BrandProperties = BRAND_PROPERTIES_RAW;
const GROUPS: Record<string, GroupInfo> = GROUPS_RAW;

const API_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "";

// -------------------- Helpers --------------------

// Sorting parameters
function getSortParams(): { sortBy: keyof BrandStats | "name"; sortAsc: boolean } {
  if (typeof window === "undefined") return { sortBy: "365", sortAsc: false };
  const params = new URLSearchParams(window.location.search);
  const rawSort = params.get("sort");
  const order = (params.get("order") ?? "desc").toLowerCase();
  const isStatKey = rawSort !== null && ["now", "today", "30", "365"].includes(rawSort);
  const sortBy: keyof BrandStats | "name" = rawSort === "name" ? "name" : isStatKey ? (rawSort as keyof BrandStats) : "365";
  return { sortBy, sortAsc: order === "asc" };
}

// Table mode (desktop vs mobile)
function getTableMode(): boolean {
  if (typeof window === "undefined") return true;
  const params = new URLSearchParams(window.location.search);
  const tableParam = params.get("table");
  const isSmallScreen = window.innerWidth < 768;
  return tableParam !== "0" && tableParam !== "false" && !isSmallScreen;
}

// Get the main brand code for a group
function getBrandMain(brandCode: string): string {
  const groupKey = BRAND_PROPERTIES[brandCode]?.group;
  if (groupKey) return GROUPS[groupKey]?.main ?? brandCode;
  return brandCode;
}

// Get brand display name (uses main if needed)
function getBrandName(brandCode: string): string {
  const brand = BRAND_PROPERTIES[brandCode];
  if (brand?.name) return brand.name;

  const main = getBrandMain(brandCode);
  return BRAND_PROPERTIES[main]?.name ?? brandCode.toUpperCase();
}

// Get any brand field (image, ga4_filter, etc.) with fallback to main
function getBrandField<T extends keyof BrandInfo>(brandCode: string, field: T): BrandInfo[T] | undefined {
  const brand = BRAND_PROPERTIES[brandCode];
  if (brand?.[field] !== undefined) return brand[field];

  const main = getBrandMain(brandCode);
  return BRAND_PROPERTIES[main]?.[field];
}

// -------------------- Component --------------------

export default function AllStatsPage() {
  const [rows, setRows] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMode, setTableMode] = useState(getTableMode());

  const { sortBy, sortAsc } = getSortParams();
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const grouped = params.get("grouped") === "true";

  async function fetchAllStats() {
    try {
      const res = await fetch(`${API_BASE}/api/all/active`, { cache: "no-store" });
      if (!res.ok) return;

      const data = await res.json();
      let newRows: BrandRow[] = [];

      // Create rows
      for (const brandCode of Object.keys(data.data)) {
        const stats = data.data[brandCode];
        const groupKey = BRAND_PROPERTIES[brandCode]?.group;

        newRows.push({
          brand: brandCode,
          stats: {
            now: stats.now ?? 0,
            today: stats.today ?? 0,
            "30": stats["30"] ?? 0,
            "365": stats["365"] ?? 0,
          },
          group: groupKey,
        });
      }

      // -------------------- Grouping --------------------
      if (grouped) {
        const groupedRows: Record<string, BrandRow> = {};

        newRows.forEach((row) => {
          const key = row.group ?? row.brand; // use group code if exists, else brand

          if (!groupedRows[key]) {
            groupedRows[key] = {
              brand: key,
              stats: { now: 0, today: 0, "30": 0, "365": 0 },
              group: row.group,
            };
          }

          groupedRows[key].stats.now! += row.stats.now ?? 0;
          groupedRows[key].stats.today! += row.stats.today ?? 0;
          groupedRows[key].stats["30"]! += row.stats["30"] ?? 0;
          groupedRows[key].stats["365"]! += row.stats["365"] ?? 0;
        });

        newRows = Object.values(groupedRows);
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

    const intervals: number[] = [
      window.setInterval(() => fetchAllStats(), 60_000),
      window.setInterval(() => fetchAllStats(), 5 * 60_000),
      window.setInterval(() => fetchAllStats(), 30 * 60_000),
    ];

    const handleResize = () => setTableMode(getTableMode());
    window.addEventListener("resize", handleResize);

    return () => {
      intervals.forEach(clearInterval);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // -------------------- Totals --------------------
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

  // -------------------- Sorting --------------------
  const sortedRows = [...rows].sort((a, b) => {
    if (sortBy === "name") {
      const nameA = grouped && a.group ? GROUPS[a.group]?.name ?? getBrandName(a.brand) : getBrandName(a.brand);
      const nameB = grouped && b.group ? GROUPS[b.group]?.name ?? getBrandName(b.brand) : getBrandName(b.brand);
      return sortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    } else {
      const valA = a.stats[sortBy] ?? 0;
      const valB = b.stats[sortBy] ?? 0;
      return sortAsc ? valA - valB : valB - valA;
    }
  });

  // -------------------- Render --------------------
  return (
    <div className="bg-white text-gray-800 min-h-screen flex flex-col gap-2 items-center justify-evenly px-10 py-2 w-full">
      {loading ? (
        <p>Loading data...</p>
      ) : rows.length === 0 ? (
        <p>No data available.</p>
      ) : (
        <>
          <p className="text-3xl font-bold m-4 capitalize">Websites Users</p>

          <div className="flex flex-wrap justify-between w-full px-8 gap-4">
            <Metric label="Total Last 365 Days" value={totals["365"]} />
            <Metric label="Total Last 30 Days" value={totals["30"]} />
            <Metric label="Total Today" value={totals.today} />
            <Metric label="Total Now" value={totals.now} />
          </div>

          {tableMode ? (
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
                {sortedRows.map((row) => {
                  const displayName = grouped && row.group ? GROUPS[row.group]?.name ?? getBrandName(row.brand) : getBrandName(row.brand);
                  return (
                    <tr key={row.brand}>
                      <td style={td}>{displayName}</td>
                      <td style={td}>{row.stats["365"]?.toLocaleString() ?? "—"}</td>
                      <td style={td}>{row.stats["30"]?.toLocaleString() ?? "—"}</td>
                      <td style={td}>{row.stats.today?.toLocaleString() ?? "—"}</td>
                      <td style={td}>{row.stats.now?.toLocaleString() ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="w-full grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
              {sortedRows.map((row) => {
                const displayName = grouped && row.group ? GROUPS[row.group]?.name ?? getBrandName(row.brand) : getBrandName(row.brand);
                return (
                  <div
                    key={row.brand}
                    className="p-2 border text-gray-600 max-w-l w-full flex flex-col border-gray-400 rounded shadow-sm bg-gray-50"
                  >
                    <div className="font-bold text-lg mb-2 text-gray-800">{displayName}</div>
                    <div>Now: <span className="font-bold text-gray-800">{row.stats.now?.toLocaleString() ?? "—"}</span></div>
                    <div>Today: <span className="font-bold text-gray-800">{row.stats.today?.toLocaleString() ?? "—"}</span></div>
                    <div>Last 30 Days: <span className="font-bold text-gray-800">{row.stats["30"]?.toLocaleString() ?? "—"}</span></div>
                    <div>Last 365 Days: <span className="font-bold text-gray-800">{row.stats["365"]?.toLocaleString() ?? "—"}</span></div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// -------------------- Metric --------------------
function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex-1 text-center p-2">
      <div className="text-2xl font-bold">{value?.toLocaleString() ?? "—"}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

// -------------------- Styles --------------------
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
