"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

export interface BizzconEvent {
  id: string;
  brand: string;
  title: string;
  eventDate: string;
  link: string;
  image?: string;
  city?: string | null;
  venue?: string | null;
  registrationUrl?: string | null;
}

interface BizzconGridProps {
  events: BizzconEvent[];
}

/* ---------- Days helpers ---------- */
function daysUntil(dateStr?: string | null): string {
  if (!dateStr) return "";
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "ENDED";
  const days = Math.ceil(diff / 86400000);
  return `${days}`;
}

function isEventUrgent(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return false;
  return Math.ceil(diff / 86400000) < 30;
}

/* Green-to-red color based on days remaining */
function daysColor(value: string): string {
  if (value === "ENDED") return "#ef4444";
  const days = parseInt(value, 10);
  if (isNaN(days)) return "#ffffff";
  if (days > 60) return "#22c55e";
  if (days > 30) return "#eab308";
  return "#ef4444";
}

/* ---------- Component ---------- */
export default function BizzconGridClient({ events }: BizzconGridProps) {
  const now = new Date();
  const tableRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);
  const PAGE_OPTIONS = [5, 6, 8, 12];
  const ROTATION_OPTIONS = [
    { label: "Pause", value: 0 },
    { label: "30 seconds", value: 30_000 },
    { label: "1 minute", value: 60_000 },
    { label: "2 minutes", value: 120_000 },
    { label: "5 minutes", value: 300_000 },
  ];
  const [pageSize, setPageSize] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? 6 : 5,
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [rotationInterval, setRotationInterval] = useState(60_000);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(() =>
    typeof document !== "undefined" && !!document.fullscreenElement,
  );
  const rotationTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);

  const upcomingEvents = useMemo(
    () => events.filter((e) => new Date(e.eventDate) > now),
    [events],
  );

  const totalPages = Math.ceil(upcomingEvents.length / pageSize);
  const displayedEvents = upcomingEvents.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const rows: (BizzconEvent | null)[] = [...displayedEvents];
  while (rows.length < pageSize) rows.push(null);

  const count = pageSize || 1;
  const effectiveCount = Math.min(count, 12);
  const rowHeight = Math.floor(70 / effectiveCount);
  const fontSize = `clamp(1.3rem, calc(0.8vw + ${7.5 / effectiveCount}vw), 4.5rem)`;
  const headerSize = `clamp(0.85rem, calc(0.5vw + ${4.5 / effectiveCount}vw), 3rem)`;
  const imgSize = Math.max(36, Math.min(160, 450 / effectiveCount));
  const mFontSize = `clamp(0.8rem, calc(1.2vw + ${9 / effectiveCount}vw), 4.5rem)`;
  const mHeaderSize = `clamp(0.65rem, calc(0.8vw + ${6 / effectiveCount}vw), 3rem)`;
  const mImgSize = Math.max(12, Math.min(60, 200 / effectiveCount));

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPageIndex(0);
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    if (rotationTimer.current) clearInterval(rotationTimer.current);
    if (rotationInterval <= 0 || totalPages <= 1) return;
    rotationTimer.current = setInterval(
      () => setPageIndex((i) => (i + 1) % totalPages),
      rotationInterval,
    );
    return () => { if (rotationTimer.current) clearInterval(rotationTimer.current); };
  }, [rotationInterval, totalPages]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div
      className={`flex flex-col justify-center h-screen pt-4 pb-8 px-0 md:px-4 overflow-hidden`}
      style={{ backgroundColor: "#0a1628" }}
      ref={tableRef}
      onClick={(e) => {
        if (e.clientY > window.innerHeight * 0.75) setShowControls(prev => !prev);
      }}
      onMouseMove={() => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        if (showControls) hideTimer.current = setTimeout(() => setShowControls(false), 5000);
      }}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const diff = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(diff) > 50) {
          if (diff < 0) setPageIndex((i) => Math.min(totalPages - 1, i + 1));
          else setPageIndex((i) => Math.max(0, i - 1));
        }
        touchStartX.current = null;
      }}
    >

      {/* ---- DESKTOP TABLE ---- */}
      <div className="hidden md:flex landscape-show flex-col flex-1 min-h-0">
        <table className="w-full border-collapse table-fixed h-full" style={{ fontSize }}>
          <thead>
            <tr className="text-center font-semibold uppercase text-white" style={{ fontSize: headerSize, backgroundColor: "#1a3a6e", borderBottom: "6px solid #0a1628" }}>
              <th className="px-2 py-3 w-[8%]"></th>
              <th className="pl-0 pr-3 py-3 w-[52%] text-left">Event Name</th>
              <th className="px-3 py-3 w-[24%]">City</th>
              <th className="px-3 py-3 w-[16%]">Days to Event</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((evt, idx) => (
              <tr
                key={evt ? (evt.id || idx) : `empty-${idx}`}
                className="text-center uppercase"
                style={{
                  height: `${rowHeight}vh`,
                  maxHeight: "12vh",
                  backgroundColor: idx % 2 === 0 ? "#0f2247" : "#162d5a",
                  color: "#ffffff",
                  borderBottom: "1px solid #1a3a6e",
                }}
              >
                <td className="px-2 py-1">
                  <div className="flex items-center justify-center mx-auto" style={{ width: imgSize, height: imgSize }}>
                    {evt?.image && (
                      <Image
                        src={evt.image}
                        alt={evt.title}
                        width={imgSize}
                        height={imgSize}
                        className="object-contain rounded"
                        style={{ maxWidth: "100%", maxHeight: "100%" }}
                        unoptimized
                      />
                    )}
                  </div>
                </td>
                <td className="pl-0 pr-2 py-1 text-left">
                  {evt && <span className="line-clamp-2" dangerouslySetInnerHTML={{ __html: evt.title }} />}
                </td>
                <td className="px-2 py-1">{evt?.city || ""}</td>
                <td className="px-2 py-1 font-mono font-bold" style={{ fontSize: "1.5em" }}>
                  {evt && (() => { const v = daysUntil(evt.eventDate); return <span className={isEventUrgent(evt.eventDate) ? "animate-flash" : ""} style={{ color: daysColor(v) }}>{v}</span>; })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- MOBILE TABLE ---- */}
      <div className="flex md:hidden landscape-hide flex-col flex-1 min-h-0">
        <table className="w-full border-collapse table-fixed h-full" style={{ fontSize: mFontSize }}>
          <thead>
            <tr className="text-center font-semibold uppercase text-white" style={{ fontSize: mHeaderSize, backgroundColor: "#1a3a6e", borderBottom: "6px solid #0a1628" }}>
              <th className="px-1 py-2 w-[45%]">Event</th>
              <th className="px-1 py-2 w-[25%]">City</th>
              <th className="px-1 py-2 pr-4 w-[30%]">Days to Event</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((evt, idx) => (
              <tr
                key={evt ? (evt.id || idx) : `empty-m-${idx}`}
                className="text-center uppercase"
                style={{
                  height: `${rowHeight}vh`,
                  maxHeight: "12vh",
                  backgroundColor: idx % 2 === 0 ? "#0f2247" : "#162d5a",
                  color: "#ffffff",
                  borderBottom: "1px solid #1a3a6e",
                }}
              >
                <td className="px-1 py-1 text-center">
                  {evt && (
                    <div className="flex flex-col items-center gap-1">
                      {evt.image && (
                        <Image
                          src={evt.image}
                          alt={evt.title}
                          width={mImgSize * 2}
                          height={mImgSize}
                          className="object-contain rounded"
                          style={{ width: mImgSize * 2, height: mImgSize }}
                          unoptimized
                        />
                      )}
                      <span className="line-clamp-2" dangerouslySetInnerHTML={{ __html: evt.title }} />
                    </div>
                  )}
                </td>
                <td className="px-1 py-1">
                  {evt?.city || ""}
                </td>
                <td className="px-1 py-1 pr-4 font-mono font-bold" style={{ fontSize: "1.5em" }}>
                  {evt && (() => { const v = daysUntil(evt.eventDate); return <span className={isEventUrgent(evt.eventDate) ? "animate-flash" : ""} style={{ color: daysColor(v), fontSize: v === "ENDED" ? "0.75em" : undefined }}>{v}</span>; })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Hidden floating control bar */}
      {showControls && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white rounded-xl shadow-lg flex flex-col md:flex-row items-center gap-3 px-4 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => setPageIndex((i) => Math.max(0, i - 1))} disabled={pageIndex === 0} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed">◀ Prev</button>
          <select value={pageSize} onChange={(e) => handlePageSizeChange(Number(e.target.value))} className="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 border-none text-sm cursor-pointer focus:outline-none [&>option]:bg-gray-800 [&>option]:text-white">
            {PAGE_OPTIONS.map((n) => (<option key={n} value={n}>{n} events</option>))}
            <option value={upcomingEvents.length}>All ({upcomingEvents.length})</option>
          </select>
          <span className="text-sm text-white/60">{pageIndex + 1} / {totalPages}</span>
          <button onClick={() => setPageIndex((i) => Math.min(totalPages - 1, i + 1))} disabled={pageIndex >= totalPages - 1} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed">Next ▶</button>
          <select value={rotationInterval} onChange={(e) => setRotationInterval(Number(e.target.value))} className="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 border-none text-sm cursor-pointer focus:outline-none [&>option]:bg-gray-800 [&>option]:text-white">
            {ROTATION_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
          </select>
          <button onClick={toggleFullscreen} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm">{isFullscreen ? "Exit ⛶" : "Fullscreen ⛶"}</button>
          <button onClick={() => window.location.href = "/"} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm">Home</button>
        </div>
      )}
    </div>
  );
}
