"use client";

import React, { useEffect, useState } from "react";
import BRAND_PROPERTIES_RAW from "@/data/brand_properties.json";
import GROUPS_RAW from "@/data/groups.json";
import Image from "next/image";
import DashboardControls from "@/src/components/DashboardControls";

type BrandStats = {
  now: number | null;
  today: number | null;
  "30": number | null;
  "365": number | null;
};

type BrandRow = {
  brand: string;
  stats: BrandStats;
  group?: string; // key of group in GROUPS
};

interface BrandInfo {
  name: string;
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

const API_BASE = "";
const DEFAULT_IMAGE = "logo/cmg.png"; // fallback image

// -------------------- Helpers --------------------

// Sorting parameters
function getSortParams(): {
  sortBy: keyof BrandStats | "name";
  sortAsc: boolean;
} {
  if (typeof window === "undefined") return { sortBy: "365", sortAsc: false };
  const params = new URLSearchParams(window.location.search);
  const rawSort = params.get("sort");
  const order = (params.get("order") ?? "desc").toLowerCase();
  const isStatKey =
    rawSort !== null && ["now", "today", "30", "365"].includes(rawSort);
  const sortBy: keyof BrandStats | "name" =
    rawSort === "name"
      ? "name"
      : isStatKey
        ? (rawSort as keyof BrandStats)
        : "365";
  return { sortBy, sortAsc: order === "asc" };
}

// Table mode (desktop vs mobile)
function getTableMode(): boolean {
  if (typeof window === "undefined") return true;
  const params = new URLSearchParams(window.location.search);
  const tableParam = params.get("table");
  if (tableParam === "0" || tableParam === "false") return false;
  // Landscape always uses the table view (matches Safari) regardless of width, so
  // Chrome and Safari stay in sync in landscape. matchMedia (not window.innerWidth)
  // is used because the two disagree across browsers — innerWidth includes the
  // scrollbar / is affected by the visual viewport, which flipped Chrome to cards.
  if (window.matchMedia("(orientation: landscape)").matches) return true;
  // Portrait: cards on phones, table on wider screens.
  return !window.matchMedia("(max-width: 767px)").matches;
}

// Get the main brand code for a group
function getBrandMain(brandCode: string): string {
  const groupKey = BRAND_PROPERTIES[brandCode]?.group;
  if (groupKey) return GROUPS[groupKey]?.main ?? brandCode;
  return brandCode;
}

// Get brand display name (uses group name if grouped)
function getBrandName(brandCode: string, grouped = false): string {
  const brand = BRAND_PROPERTIES[brandCode];
  if (!grouped) return brand?.name ?? brandCode.toUpperCase();

  const groupKey = brand?.group;
  if (groupKey)
    return (
      GROUPS[groupKey]?.name ??
      BRAND_PROPERTIES[getBrandMain(brandCode)]?.name ??
      brandCode.toUpperCase()
    );
  return brand?.name ?? brandCode.toUpperCase();
}

// Get brand image (with fallback to main or default)
function getBrandImage(brandCode: string, grouped = false): string {
  const brand = BRAND_PROPERTIES[brandCode];
  if (brand?.image) return brand.image;

  if (grouped && brand?.group) {
    const mainBrand = GROUPS[brand.group]?.main ?? brandCode;
    const mainImage = BRAND_PROPERTIES[mainBrand]?.image;
    if (mainImage) return mainImage;
  }

  return DEFAULT_IMAGE;
}

// -------------------- Component --------------------

export default function AllStatsPage() {
  const [rows, setRows] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMode, setTableMode] = useState(getTableMode());

  const { sortBy, sortAsc } = getSortParams();

  async function fetchAllStats() {
    try {
      const res = await fetch(`${API_BASE}/api/all/active`, {
        cache: "no-store",
      });
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

      // Handle grouped view
      const params = new URLSearchParams(window.location.search);
      const grouped = params.get("grouped") === "true";

      if (grouped) {
        const groupedRows: Record<string, BrandRow> = {};

        newRows.forEach((row) => {
          const mainBrand = row.group ? getBrandMain(row.brand) : row.brand;

          if (!groupedRows[mainBrand]) {
            groupedRows[mainBrand] = {
              brand: mainBrand,
              stats: { now: 0, today: 0, "30": 0, "365": 0 },
              group: row.group,
            };
          }

          groupedRows[mainBrand].stats.now! += row.stats.now ?? 0;
          groupedRows[mainBrand].stats.today! += row.stats.today ?? 0;
          groupedRows[mainBrand].stats["30"]! += row.stats["30"] ?? 0;
          groupedRows[mainBrand].stats["365"]! += row.stats["365"] ?? 0;
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
    // Also listen on the breakpoint + orientation so the table/card switch fires
    // reliably on rotation (matches how the leaderboards detect their layout).
    const widthMq = window.matchMedia("(max-width: 767px)");
    const orientationMq = window.matchMedia("(orientation: landscape)");
    widthMq.addEventListener("change", handleResize);
    orientationMq.addEventListener("change", handleResize);

    return () => {
      intervals.forEach(clearInterval);
      window.removeEventListener("resize", handleResize);
      widthMq.removeEventListener("change", handleResize);
      orientationMq.removeEventListener("change", handleResize);
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
    { now: 0, today: 0, "30": 0, "365": 0 },
  );

  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const grouped = params.get("grouped") === "true";

  // -------------------- Sorting --------------------
  const sortedRows = [...rows].sort((a, b) => {
    if (sortBy === "name") {
      const nameA = getBrandName(a.brand, grouped);
      const nameB = getBrandName(b.brand, grouped);
      return sortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    } else {
      const valA = a.stats[sortBy] ?? 0;
      const valB = b.stats[sortBy] ?? 0;
      return sortAsc ? valA - valB : valB - valA;
    }
  });

  // -------------------- Render --------------------
  return (
    <div className="bg-white text-gray-800 min-h-screen flex flex-col gap-2 items-center justify-evenly px-10 pt-2 pb-18 w-full">
      {loading ? (
        <p>Loading data...</p>
      ) : rows.length === 0 ? (
        <p>No data available.</p>
      ) : (
        <>
          <p className="text-3xl font-bold m-4 capitalize">Websites Users</p>

          <div className="flex flex-wrap justify-between w-full px-8 gap-4">
            <Metric
              label="Active Users for Last 365 Days"
              value={totals["365"]}
            />
            <Metric
              label="Active Users for Last 30 Days"
              value={totals["30"]}
            />
            <Metric label="Active Users Today" value={totals.today} />
            <Metric
              label="Active Users for Last 30 Minutes"
              value={totals.now}
            />
          </div>

          {tableMode ? (
            <table className="all-active-table w-full border-collapse">
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
                  const displayName = getBrandName(row.brand, grouped);
                  const img = getBrandImage(row.brand, grouped);
                  return (
                    <tr key={row.brand}>
                      <td style={td} className="flex items-center gap-2">
                        <div className="w-30 relative h-7">
                          <Image
                            src={`/${img}`}
                            alt={displayName}
                            fill
                            style={{ objectFit: "contain" }}
                            className="drop-shadow-md"
                          />
                        </div>
                        {displayName}
                      </td>
                      <td style={td}>
                        {row.stats["365"]?.toLocaleString() ?? "—"}
                      </td>
                      <td style={td}>
                        {row.stats["30"]?.toLocaleString() ?? "—"}
                      </td>
                      <td style={td}>
                        {row.stats.today?.toLocaleString() ?? "—"}
                      </td>
                      <td style={td}>
                        {row.stats.now?.toLocaleString() ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="w-full grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
              {sortedRows.map((row) => {
                const displayName = getBrandName(row.brand, grouped);
                const img = getBrandImage(row.brand, grouped);
                return (
                  <div
                    key={row.brand}
                    className="p-2 border text-gray-600 max-w-l w-full flex flex-row border-gray-400 rounded shadow-sm bg-gray-50"
                  >
                    <div className="content-center">
                      <div className="relative w-20 h-20 m-2">
                        <Image
                          src={`/${img}`}
                          alt={displayName}
                          fill
                          style={{ objectFit: "contain" }}
                          className="shadow-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 font-bold text-lg mb-2 text-gray-800">
                        {displayName}
                      </div>
                      <div className="text-right">
                        Now:{" "}
                        <span className="font-bold text-gray-800">
                          {row.stats.now?.toLocaleString() ?? "—"}
                        </span>
                      </div>
                      <div className="text-right">
                        Today:{" "}
                        <span className="font-bold text-gray-800">
                          {row.stats.today?.toLocaleString() ?? "—"}
                        </span>
                      </div>
                      <div className="text-right">
                        Last 30 Days:{" "}
                        <span className="font-bold text-gray-800">
                          {row.stats["30"]?.toLocaleString() ?? "—"}
                        </span>
                      </div>
                      <div className="text-right">
                        Last 365 Days:{" "}
                        <span className="font-bold text-gray-800">
                          {row.stats["365"]?.toLocaleString() ?? "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      {/* Floating control — only Home, opened by clicking the handle itself. */}
      <DashboardControls showFullscreen={false} openOnBottomTap={false} />
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
  padding: "2px",
  borderBottom: "1px solid #cccccc43",
  fontSize: "1.1rem",
};
