"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const REFRESH_MS = 30 * 60 * 1000;

type Cell = number | string | null;

type Week = {
  week: string;
  values: Record<string, Cell>;
  weeklyTotal: number;
  monthlyTotal: number | null;
};

type Payload = {
  salespeople: string[];
  weeks: Week[];
  totals: Record<string, number>;
  grandTotal: number;
  lastUpdated: string;
};

function formatCurrency(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function rankColor(rank: number): string {
  if (rank === 1) return "#FFD700";
  if (rank === 2) return "#C0C0C0";
  if (rank === 3) return "#CD7F32";
  return "#ffffff";
}

export default function SponsorshipLeaderboard() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(() =>
    typeof document !== "undefined" && !!document.fullscreenElement,
  );
  const hideTimer = useRef<NodeJS.Timeout | null>(null);
  const cancelledRef = useRef(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/sponsorship", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as Payload;
      if (!cancelledRef.current) {
        setData(json);
        setError(null);
      }
    } catch (e) {
      if (!cancelledRef.current) setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      if (!cancelledRef.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { cancelledRef.current = true; clearInterval(id); };
  }, [load]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const ranked = useMemo(() => {
    if (!data) return [];
    return data.salespeople
      .map((name) => ({ name, total: data.totals[name] ?? 0 }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-screen text-red-400 text-center px-6" style={{ backgroundColor: "#0a0a0a" }}>
        Failed to load: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen text-white/70" style={{ backgroundColor: "#0a0a0a" }}>
        Loading...
      </div>
    );
  }

  const rowCount = ranked.length + 1;
  const effectiveCount = Math.min(rowCount, 12);
  const rowHeight = Math.floor(70 / effectiveCount);
  const fontSize = `clamp(1.3rem, calc(0.8vw + ${7.5 / effectiveCount}vw), 4.5rem)`;
  const headerSize = `clamp(0.85rem, calc(0.5vw + ${4.5 / effectiveCount}vw), 3rem)`;
  const mFontSize = `clamp(0.9rem, calc(1.2vw + ${9 / effectiveCount}vw), 4.5rem)`;
  const mHeaderSize = `clamp(0.7rem, calc(0.8vw + ${6 / effectiveCount}vw), 3rem)`;

  return (
    <div
      className="flex flex-col justify-center h-screen pt-4 pb-8 px-0 md:px-4 overflow-hidden"
      style={{ backgroundColor: "#0a0a0a" }}
      onClick={(e) => {
        if (e.clientY > window.innerHeight * 0.75) setShowControls((prev) => !prev);
      }}
      onMouseMove={() => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        if (showControls) hideTimer.current = setTimeout(() => setShowControls(false), 5000);
      }}
    >
      {/* ---- DESKTOP TABLE ---- */}
      <div className="hidden md:flex landscape-show flex-col flex-1 min-h-0">
        <table className="w-full border-collapse table-fixed h-full" style={{ fontSize }}>
          <thead>
            <tr className="text-center font-semibold uppercase text-white/90" style={{ fontSize: headerSize, backgroundColor: "#1a1a1a", letterSpacing: "0.12em" }}>
              <th className="px-2 py-3 w-[14%]">Rank</th>
              <th className="pl-0 pr-3 py-3 w-[56%] text-left">Person in Charge</th>
              <th className="px-3 py-3 w-[30%] text-right">Total Sales</th>
            </tr>
            <tr><td colSpan={3} style={{ padding: 0, height: "2px", background: "linear-gradient(90deg, #d4a853, transparent)" }} /></tr>
          </thead>
          <tbody>
            {ranked.map((row, idx) => {
              const rank = idx + 1;
              const color = rankColor(rank);
              return (
                <tr
                  key={row.name}
                  className="text-center uppercase"
                  style={{
                    height: `${rowHeight}vh`,
                    maxHeight: "12vh",
                    background: idx % 2 === 0 ? "linear-gradient(90deg, #111111, #151515)" : "linear-gradient(90deg, #1a1a1a, #1e1e1e)",
                    color: "#ffffff",
                    borderBottom: "0.5px solid #222",
                  }}
                >
                  <td className="px-2 py-1 font-mono font-bold" style={{ color, textShadow: `0 0 8px ${color}40, 0 0 20px ${color}20`, fontSize: "1.3em" }}>
                    #{rank}
                  </td>
                  <td className="pl-0 pr-2 py-1 text-left" style={{ fontWeight: 300 }}>
                    {row.name}
                  </td>
                  <td className="px-3 py-1 text-right font-mono font-bold" style={{ color: row.total > 0 ? "#22c55e" : "#555" }}>
                    {formatCurrency(row.total)}
                  </td>
                </tr>
              );
            })}
            <tr
              className="text-center uppercase"
              style={{
                height: `${rowHeight}vh`,
                maxHeight: "12vh",
                background: "linear-gradient(90deg, #1a1a1a, #2a2416)",
                borderTop: "2px solid #d4a853",
                color: "#d4a853",
              }}
            >
              <td className="px-2 py-1" />
              <td className="pl-0 pr-2 py-1 text-left font-semibold" style={{ letterSpacing: "0.12em" }}>
                Total
              </td>
              <td className="px-3 py-1 text-right font-mono font-bold" style={{ fontSize: "1.15em", textShadow: "0 0 8px #d4a85340, 0 0 20px #d4a85320" }}>
                {formatCurrency(data.grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ---- MOBILE TABLE ---- */}
      <div className="flex md:hidden landscape-hide flex-col flex-1 min-h-0">
        <table className="w-full border-collapse table-fixed h-full" style={{ fontSize: mFontSize }}>
          <thead>
            <tr className="text-center font-semibold uppercase text-white/90" style={{ fontSize: mHeaderSize, backgroundColor: "#1a1a1a", letterSpacing: "0.12em" }}>
              <th className="px-1 py-2 w-[18%]">Rank</th>
              <th className="px-1 py-2 w-[47%] text-left">Person in Charge</th>
              <th className="px-1 py-2 pr-3 w-[35%] text-right">Total</th>
            </tr>
            <tr><td colSpan={3} style={{ padding: 0, height: "2px", background: "linear-gradient(90deg, #d4a853, transparent)" }} /></tr>
          </thead>
          <tbody>
            {ranked.map((row, idx) => {
              const rank = idx + 1;
              const color = rankColor(rank);
              return (
                <tr
                  key={row.name}
                  className="text-center uppercase"
                  style={{
                    height: `${rowHeight}vh`,
                    maxHeight: "12vh",
                    background: idx % 2 === 0 ? "linear-gradient(90deg, #111111, #151515)" : "linear-gradient(90deg, #1a1a1a, #1e1e1e)",
                    color: "#ffffff",
                    borderBottom: "0.5px solid #222",
                  }}
                >
                  <td className="px-1 py-1 font-mono font-bold" style={{ color, textShadow: `0 0 8px ${color}40, 0 0 20px ${color}20`, fontSize: "1.25em" }}>
                    #{rank}
                  </td>
                  <td className="px-1 py-1 text-left" style={{ fontWeight: 300 }}>
                    {row.name}
                  </td>
                  <td className="px-1 py-1 pr-3 text-right font-mono font-bold" style={{ color: row.total > 0 ? "#22c55e" : "#555" }}>
                    {formatCurrency(row.total)}
                  </td>
                </tr>
              );
            })}
            <tr
              className="text-center uppercase"
              style={{
                height: `${rowHeight}vh`,
                maxHeight: "12vh",
                background: "linear-gradient(90deg, #1a1a1a, #2a2416)",
                borderTop: "2px solid #d4a853",
                color: "#d4a853",
              }}
            >
              <td className="px-1 py-1" />
              <td className="px-1 py-1 text-left font-semibold" style={{ letterSpacing: "0.12em" }}>
                Total
              </td>
              <td className="px-1 py-1 pr-3 text-right font-mono font-bold" style={{ fontSize: "1.1em", textShadow: "0 0 8px #d4a85340, 0 0 20px #d4a85320" }}>
                {formatCurrency(data.grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Hidden floating control bar */}
      {showControls && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white rounded-xl shadow-lg flex flex-col md:flex-row items-center gap-3 px-4 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => load()}
            disabled={refreshing}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>
          <span className="text-xs text-white/50">
            {data ? `Updated ${new Date(data.lastUpdated).toLocaleTimeString()}` : ""}
          </span>
          <button
            onClick={toggleFullscreen}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
          >
            {isFullscreen ? "Exit ⛶" : "Fullscreen ⛶"}
          </button>
          <button
            onClick={() => (window.location.href = "/dashboard/bizzcon")}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
          >
            Events
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
          >
            Home
          </button>
        </div>
      )}
    </div>
  );
}
