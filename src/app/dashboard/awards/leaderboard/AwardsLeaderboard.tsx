"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardControls from "@/src/components/DashboardControls";

const REFRESH_MS = 30 * 60 * 1000;

type Entry = {
  name: string;
  total: number;
  deals: number;
  topAward: string;
};

type Payload = {
  entries: Entry[];
  grandTotal: number;
  lastUpdated: string;
};

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

function rankColor(rank: number): string {
  if (rank === 1) return "#FFD700";
  if (rank === 2) return "#C0C0C0";
  if (rank === 3) return "#CD7F32";
  return "#ffffff";
}

export default function AwardsLeaderboard() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState<number | "all">(10);
  const [rotationMs, setRotationMs] = useState(15_000);
  const cancelledRef = useRef(false);
  // Short landscape phones render the desktop table (landscape-show). Detect that
  // case so the rows can shrink to fit the short height instead of clipping at
  // the 40px floor. Keyed on max-height (landscape phones are wider than 950px).
  const [isLandscapePhone, setIsLandscapePhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape) and (max-height: 600px)");
    const apply = () => setIsLandscapePhone(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  // Any phone (portrait OR landscape). Used to pin the root to the real visible
  // height + lock scroll so the dashboard is fit-to-screen on phones — in Chrome,
  // a plain 100dvh resolves to the toolbar-collapsed (taller) height and makes
  // the page scroll. Tablets/desktop/TV are excluded.
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px), (max-height: 600px)");
    const apply = () => setIsPhone(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  // CSS dvh/svh disagree across Safari and Chrome in landscape (toolbar height),
  // so the bottom row clips in one or the other. window.innerHeight is the true
  // visible height in BOTH, so pin the root to it (in px) on landscape phones.
  const [viewportH, setViewportH] = useState<number | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    // visualViewport.height is the actual visible area (toolbar-aware); innerHeight
    // can report the toolbar-collapsed (larger) height before Chrome settles on a
    // fresh landscape navigation, which over-sizes the page and hides the header
    // under the top toolbar. Re-measure on the next frame + after a tick so we
    // pick up the settled value.
    const apply = () => setViewportH(Math.round(vv?.height ?? window.innerHeight));
    apply();
    const raf = requestAnimationFrame(apply);
    const t = setTimeout(apply, 300);
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
    };
  }, []);
  // Landscape is fit-to-screen, so lock the document scroll there (otherwise the
  // page can still be dragged/overscrolled). Portrait stays scrollable since its
  // taller list intentionally scrolls, so only lock while in landscape.
  useEffect(() => {
    if (!isPhone) return;
    window.scrollTo(0, 0);
    const html = document.documentElement;
    const { overflow: prevHtml } = html.style;
    const { overflow: prevBody, overscrollBehavior: prevOverscroll } =
      document.body.style;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, [isPhone]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/awards/leaderboard", { cache: "no-store" });
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

  const ranked = useMemo<Entry[]>(() => {
    if (!data) return [];
    return [...data.entries].sort((a, b) => b.deals - a.deals);
  }, [data]);
  const grandDeals = useMemo<number>(() => ranked.reduce((s, e) => s + e.deals, 0), [ranked]);

  const entryCount = ranked.length;
  const effectivePageSize = pageSize === "all" ? Math.max(1, entryCount) : pageSize;
  const totalPagesForRotation = Math.max(1, Math.ceil(entryCount / effectivePageSize));
  useEffect(() => { setPageIndex(0); }, [pageSize]);
  // 20/page can't fit a landscape phone, so fall back to 10 if we rotate into
  // landscape while it's selected (the option is also hidden there).
  useEffect(() => {
    if (isLandscapePhone && pageSize === 20) setPageSize(10);
  }, [isLandscapePhone, pageSize]);
  useEffect(() => {
    if (totalPagesForRotation <= 1 || rotationMs <= 0) return;
    const id = setInterval(() => {
      setPageIndex((p) => (p + 1) % totalPagesForRotation);
    }, rotationMs);
    return () => clearInterval(id);
  }, [totalPagesForRotation, rotationMs]);

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-screen text-red-400 text-center px-6" style={{ backgroundColor: "#2a2a2a" }}>
        Failed to load: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen text-white/70" style={{ backgroundColor: "#2a2a2a" }}>
        Loading...
      </div>
    );
  }

  const resolvedPageSize = pageSize === "all" ? Math.max(1, ranked.length) : pageSize;
  const totalPages = Math.max(1, Math.ceil(ranked.length / resolvedPageSize));
  const currentPage = Math.min(pageIndex, totalPages - 1);
  const displayed = ranked.slice(currentPage * resolvedPageSize, (currentPage + 1) * resolvedPageSize);
  const padCount = Math.max(0, resolvedPageSize - displayed.length);
  const rowCount = resolvedPageSize + 2;
  const effectiveCount = Math.min(rowCount, 12);
  const rowHeightVh = 92 / rowCount;
  // Short landscape phones render this (desktop) table but in a tiny area, so cap
  // the row + header fonts much smaller there for a compact, non-chunky look.
  // Desktop/TV keep their large ceilings.
  const fontSize = isLandscapePhone
    ? `clamp(0.6rem, min(calc(0.7vw + ${7 / effectiveCount}vw), ${rowHeightVh * 0.42}dvh), 1.05rem)`
    : `clamp(1rem, min(calc(1vw + ${11 / effectiveCount}vw), ${rowHeightVh * 0.55}vh), 5rem)`;
  const headerSize = isLandscapePhone
    ? `clamp(0.5rem, min(calc(0.45vw + ${4 / effectiveCount}vw), ${rowHeightVh * 0.3}dvh), 0.8rem)`
    : `clamp(0.85rem, min(calc(0.6vw + ${6 / effectiveCount}vw), ${rowHeightVh * 0.42}vh), 3rem)`;
  const mFontSize = `clamp(${pageSize === 20 ? "0.6rem" : "0.95rem"}, min(calc(1.4vw + ${11 / effectiveCount}vw), ${rowHeightVh * 0.55}vh), 4.5rem)`;
  const mHeaderSize = `clamp(${pageSize === 20 ? "0.5rem" : "0.8rem"}, min(calc(1vw + ${7 / effectiveCount}vw), ${rowHeightVh * 0.42}vh), 2.8rem)`;
  // Short landscape phone: let the desktop table's rows collapse below the 40px
  // floor and measure in dvh (Chrome's toolbar shrinks the visible height), and
  // trim the header padding so all 12 rows (10 + total + header) fit without
  // clipping. Desktop/TV keep vh + the 40px floor + roomy header.
  const rowUnit = isLandscapePhone ? "dvh" : "vh";
  const rowMinH = isLandscapePhone ? "0px" : "40px";
  const headPad = isLandscapePhone ? "py-1" : "py-3";
  // Landscape "All": show ~15 data rows and scroll the rest, with the header and
  // Total frozen (sticky) above/below the scrolling body. Row height is a fixed
  // slice of the visible height so ~15 fit (15 rows + header + total ≈ 17 slots);
  // fonts track that height.
  const allScroll = isLandscapePhone && pageSize === "all";
  const allRowH = viewportH != null ? Math.max(18, Math.round(viewportH / 17)) : 26;
  const allFont = Math.max(9, Math.min(15, Math.round(allRowH * 0.52)));
  const allHeadFont = Math.max(8, Math.round(allFont * 0.85));
  // Portrait 20/page: let the mobile rows shrink below the 40px floor so all 20 +
  // the total fit, and make the column scrollable as a fallback on short phones.
  // (Only used in the mobile table, which is portrait-only.)
  const mobile20 = pageSize === 20;
  const mobileRowMinH = mobile20 ? "0px" : rowMinH;
  // Portrait "All": same as landscape — show ~15 rows, scroll the rest, freeze
  // the header + Total. (Only used in the mobile table, which is portrait-only.)
  const mAllScroll = pageSize === "all";
  // Portrait phone, fit-to-screen pages (10/20/page): the root is pinned to the
  // real visible height (viewportH px), but raw `vh` row heights resolve to
  // Chrome's toolbar-collapsed (taller) viewport, so the rows sum past the
  // container and the Total row is pushed off the bottom — clipped in Chrome,
  // while Safari's `vh` matches the visible height so it shows. Size the rows in
  // px off viewportH instead so they fit the real height in both browsers.
  const phonePxRows = isPhone && !isLandscapePhone && !mAllScroll && viewportH != null;
  const phoneRowH = phonePxRows
    ? Math.max(1, Math.round((viewportH * 0.92) / rowCount))
    : null;
  const mobileRowH = mAllScroll
    ? `${allRowH}px`
    : phoneRowH != null
    ? `${phoneRowH}px`
    : `${rowHeightVh}${rowUnit}`;
  const mobileRowMin = mAllScroll
    ? `${allRowH}px`
    : phoneRowH != null
    ? `${phoneRowH}px`
    : mobileRowMinH;

  return (
    <div
      className={`flex flex-col px-0 md:px-4 overflow-hidden ${
        isPhone ? "justify-start" : "justify-center"
      } ${isPhone && viewportH != null ? "fixed inset-x-0 top-0" : "h-[100dvh]"}`}
      style={{
        backgroundColor: "#2a2a2a",
        ...(isPhone && viewportH != null ? { height: viewportH } : {}),
      }}
    >
      {/* ---- DESKTOP TABLE ---- */}
      <div className={`hidden md:flex landscape-show flex-col flex-1 min-h-0 ${allScroll ? "overflow-y-auto" : ""}`}>
        <table
          className={`lb-table w-full border-collapse table-fixed ${allScroll ? "" : "h-full"}`}
          style={{ fontSize: allScroll ? `${allFont}px` : fontSize }}
        >
          <thead className={allScroll ? "sticky top-0 z-20" : undefined}>
            <tr className="text-center font-semibold uppercase text-white/90" style={{ fontSize: allScroll ? `${allHeadFont}px` : headerSize, backgroundColor: "#3a3a3a", letterSpacing: "0.12em" }}>
              <th className={`px-2 ${headPad} w-[14%]`}>Rank</th>
              <th className={`pl-0 pr-3 ${headPad} w-[56%] text-left`}>Person in Charge</th>
              <th className={`px-3 ${headPad} w-[30%] text-right`}>Number of Paying Nominations</th>
            </tr>
            <tr><td colSpan={3} style={{ padding: 0, height: "2px", background: "linear-gradient(90deg, #d4a853, transparent)" }} /></tr>
          </thead>
          <tbody>
            {displayed.map((row, idx) => {
              const rank = currentPage * resolvedPageSize + idx + 1;
              const color = rankColor(rank);
              return (
                <tr
                  key={row.name}
                  className="text-center uppercase"
                  style={{
                    height: allScroll ? `${allRowH}px` : `${rowHeightVh}${rowUnit}`,
                    minHeight: allScroll ? `${allRowH}px` : rowMinH,
                    background: idx % 2 === 0 ? "linear-gradient(90deg, #4A4A4A, #505050)" : "linear-gradient(90deg, #73787C, #7A7F83)",
                    color: "#ffffff",
                    borderBottom: "0.5px solid #222",
                  }}
                >
                  <td className="px-2 py-1 font-mono font-bold" style={{ color, textShadow: rank <= 3 ? `0 1px 3px rgba(0,0,0,0.8), 0 0 8px ${color}40, 0 0 20px ${color}20` : "0 1px 3px rgba(0,0,0,0.8)", fontSize: isLandscapePhone ? "1em" : "1.3em" }}>
                    #{rank}
                  </td>
                  <td className="pl-0 pr-2 py-1 text-left" style={{ fontWeight: 300 }}>
                    {row.name}
                  </td>
                  <td className="px-3 py-1 text-right font-mono font-bold" style={{ color: row.deals > 0 ? "#00ff88" : "#bbbbbb", textShadow: row.deals > 0 ? "0 1px 3px rgba(0,0,0,0.8), 0 0 12px rgba(0,255,136,0.3)" : "none" }}>
                    {formatCount(row.deals)}
                  </td>
                </tr>
              );
            })}
            {Array.from({ length: padCount }).map((_, i) => {
              const idx = displayed.length + i;
              return (
                <tr
                  key={`pad-d-${i}`}
                  style={{
                    height: `${rowHeightVh}${rowUnit}`,
                    minHeight: rowMinH,
                    background: idx % 2 === 0 ? "linear-gradient(90deg, #4A4A4A, #505050)" : "linear-gradient(90deg, #73787C, #7A7F83)",
                    borderBottom: "0.5px solid #222",
                  }}
                >
                  <td colSpan={3} />
                </tr>
              );
            })}
            <tr
              className={`text-center uppercase ${allScroll ? "sticky bottom-0 z-20" : ""}`}
              style={{
                height: allScroll ? `${allRowH}px` : `${rowHeightVh}${rowUnit}`,
                minHeight: allScroll ? `${allRowH}px` : rowMinH,
                background: "linear-gradient(90deg, #2a2a2a, #3a3020)",
                borderTop: "2px solid rgba(212, 168, 83, 0.6)",
                color: "#f0c668",
                textShadow: "0 1px 3px rgba(0,0,0,0.8)",
              }}
            >
              <td className="px-2 py-1" />
              <td className="pl-0 pr-2 py-1 text-left font-semibold" style={{ letterSpacing: "0.12em" }}>
                Total
              </td>
              <td className="px-3 py-1 text-right font-mono font-bold" style={{ fontSize: "1.15em", textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 0 8px #d4a85340, 0 0 20px #d4a85320" }}>
                {formatCount(grandDeals)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ---- MOBILE TABLE (portrait) ---- */}
      {/* Fit-to-screen (no scroll): rows stretch to fill via the table's h-full.
          20/page additionally lets rows shrink below the 40px floor so all 20 +
          the total still fit. */}
      <div className={`flex md:hidden landscape-hide flex-col flex-1 min-h-0 ${mAllScroll ? "overflow-y-auto" : ""}`}>
        <table className={`w-full border-collapse table-fixed ${mAllScroll ? "" : "h-full"} ${mobile20 ? "mobile-tight" : ""}`} style={{ fontSize: mAllScroll ? `${allFont}px` : mFontSize }}>
          <thead className={mAllScroll ? "sticky top-0 z-20" : undefined}>
            <tr className="text-center font-semibold uppercase text-white/90" style={{ fontSize: mAllScroll ? `${allHeadFont}px` : mHeaderSize, backgroundColor: "#3a3a3a", letterSpacing: "0.12em" }}>
              <th className="px-1 py-2 w-[16%]">Rank</th>
              <th className="px-1 py-2 w-[50%] text-left">Person</th>
              <th className="px-1 py-2 pr-3 w-[34%] text-right">Number of Paying Nominations</th>
            </tr>
            <tr><td colSpan={3} style={{ padding: 0, height: "2px", background: "linear-gradient(90deg, #d4a853, transparent)" }} /></tr>
          </thead>
          <tbody>
            {displayed.map((row, idx) => {
              const rank = currentPage * resolvedPageSize + idx + 1;
              const color = rankColor(rank);
              return (
                <tr
                  key={row.name}
                  className="text-center uppercase"
                  style={{
                    height: mobileRowH,
                    minHeight: mobileRowMin,
                    background: idx % 2 === 0 ? "linear-gradient(90deg, #4A4A4A, #505050)" : "linear-gradient(90deg, #73787C, #7A7F83)",
                    color: "#ffffff",
                    borderBottom: "0.5px solid #222",
                  }}
                >
                  <td className="px-1 py-1 font-mono font-bold" style={{ color, textShadow: rank <= 3 ? `0 1px 3px rgba(0,0,0,0.8), 0 0 8px ${color}40, 0 0 20px ${color}20` : "0 1px 3px rgba(0,0,0,0.8)", fontSize: mobile20 ? "1em" : "1.25em" }}>
                    #{rank}
                  </td>
                  <td className="px-1 py-1 text-left" style={{ fontWeight: 300 }}>
                    {row.name}
                  </td>
                  <td className="px-1 py-1 pr-3 text-right font-mono font-bold" style={{ color: row.deals > 0 ? "#00ff88" : "#bbbbbb", textShadow: row.deals > 0 ? "0 1px 3px rgba(0,0,0,0.8), 0 0 12px rgba(0,255,136,0.3)" : "none" }}>
                    {formatCount(row.deals)}
                  </td>
                </tr>
              );
            })}
            {Array.from({ length: padCount }).map((_, i) => {
              const idx = displayed.length + i;
              return (
                <tr
                  key={`pad-m-${i}`}
                  style={{
                    height: mobileRowH,
                    minHeight: mobileRowMin,
                    background: idx % 2 === 0 ? "linear-gradient(90deg, #4A4A4A, #505050)" : "linear-gradient(90deg, #73787C, #7A7F83)",
                    borderBottom: "0.5px solid #222",
                  }}
                >
                  <td colSpan={3} />
                </tr>
              );
            })}
            <tr
              className={`text-center uppercase ${mAllScroll ? "sticky bottom-0 z-20" : ""}`}
              style={{
                height: mobileRowH,
                minHeight: mobileRowMin,
                background: "linear-gradient(90deg, #2a2a2a, #3a3020)",
                borderTop: "2px solid rgba(212, 168, 83, 0.6)",
                color: "#f0c668",
                textShadow: "0 1px 3px rgba(0,0,0,0.8)",
              }}
            >
              <td className="px-1 py-1" />
              <td className="px-1 py-1 text-left font-semibold" style={{ letterSpacing: "0.12em" }}>
                Total
              </td>
              <td className="px-1 py-1 pr-3 text-right font-mono font-bold" style={{ fontSize: "1.1em", textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 0 8px #d4a85340, 0 0 20px #d4a85320" }}>
                {formatCount(grandDeals)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <DashboardControls>
        <button onClick={() => load()} disabled={refreshing} className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60 disabled:opacity-40 disabled:cursor-not-allowed">{refreshing ? "Refreshing..." : "↻ Refresh"}</button>
        <button onClick={() => setPageIndex((p) => (p - 1 + totalPages) % totalPages)} disabled={totalPages <= 1} className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60 disabled:opacity-30 disabled:cursor-not-allowed">◀ Prev</button>
        <select value={pageSize === "all" ? "all" : String(pageSize)} onChange={(e) => setPageSize(e.target.value === "all" ? "all" : Number(e.target.value))} className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60 [&>option]:bg-gray-800 [&>option]:text-white">
          <option value="10">10 / page</option>
          {!isLandscapePhone && <option value="20">20 / page</option>}
          <option value="all">All</option>
        </select>
        <span className="text-sm text-white/80">{currentPage + 1} / {totalPages}</span>
        <button onClick={() => setPageIndex((p) => (p + 1) % totalPages)} disabled={totalPages <= 1} className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60 disabled:opacity-30 disabled:cursor-not-allowed">Next ▶</button>
        <select value={rotationMs} onChange={(e) => setRotationMs(Number(e.target.value))} className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60 [&>option]:bg-gray-800 [&>option]:text-white">
          <option value="0">No rotate</option>
          <option value="5000">5s</option>
          <option value="10000">10s</option>
          <option value="15000">15s</option>
          <option value="30000">30s</option>
          <option value="60000">60s</option>
        </select>
        <span className="text-xs text-white/70">{data ? `Updated ${new Date(data.lastUpdated).toLocaleTimeString()}` : ""}</span>
        <button onClick={() => (window.location.href = "/dashboard/awards")} className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60">Awards</button>
      </DashboardControls>
    </div>
  );
}
