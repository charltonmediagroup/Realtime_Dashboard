"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Countdown from "@/src/components/Countdown";

export interface Award {
  id: string;
  brand: string;
  title: string;
  field_date: string;
  view_node: string;
  startDate?: string | null;
  endDate?: string | null;
  image?: string;
  city?: string | null;
  contactPerson?: string | null;
}

interface AwardsGridProps {
  awards: Award[];
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ---------- Submission Status Helpers ---------- */
function getSubmissionOpen(startDate?: string | null) {
  if (!startDate) return "Submission Closed";

  const now = new Date();
  const start = new Date(startDate);

  if (start > now) {
    return <Countdown target={startDate} done="Submission Open" />;
  }

  return "Submission Open";
}

function getSubmissionClose(endDate?: string | null) {
  if (!endDate) return "Submission Closed";

  const now = new Date();
  const end = new Date(endDate);

  if (end > now) {
    return <Countdown target={endDate} done="Submission Closed" />;
  }

  return "Submission Closed";
}

/* ---------- Component ---------- */
export default function AwardsGridClient({ awards }: AwardsGridProps) {
  const now = new Date();
  const tableRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);
  const PAGE_OPTIONS = [5, 10, 20];
  const ROTATION_OPTIONS = [
    { label: "Pause", value: 0 },
    { label: "30 seconds", value: 30_000 },
    { label: "1 minute", value: 60_000 },
    { label: "2 minutes", value: 120_000 },
    { label: "5 minutes", value: 300_000 },
  ];
  const [pageSize, setPageSize] = useState(5);
  const [pageIndex, setPageIndex] = useState(0);
  const [rotationInterval, setRotationInterval] = useState(60_000);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(() =>
    typeof document !== "undefined" && !!document.fullscreenElement,
  );
  const rotationTimer = useRef<NodeJS.Timeout | null>(null);

  // Only upcoming awards (memoized – awards array is stable from server)
  const upcomingAwards = useMemo(
    () => awards.filter((award) => new Date(award.field_date) > now),
    [awards],
  );

  const totalPages = Math.ceil(upcomingAwards.length / pageSize);
  const displayedAwards = upcomingAwards.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  // Dynamic sizing — font uses vw (width-based), row height uses vh
  const count = Math.max(displayedAwards.length, pageSize) || 1;
  const scrollable = count > 10;
  const effectiveCount = Math.min(count, 10); // cap sizing at 10 for readability
  const rowHeight = Math.floor(85 / effectiveCount);
  const fontSize = `clamp(0.9rem, calc(0.4vw + ${5 / effectiveCount}vw), 3.5rem)`;
  const headerSize = `clamp(0.85rem, calc(0.4vw + ${4.5 / effectiveCount}vw), 3rem)`;
  const imgSize = Math.max(48, Math.min(180, 500 / effectiveCount));

  // Reset to first page when page size changes
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPageIndex(0);
  };

  // Track fullscreen state
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Auto-rotate pages
  useEffect(() => {
    if (rotationTimer.current) clearInterval(rotationTimer.current);
    if (rotationInterval <= 0 || totalPages <= 1) return;
    rotationTimer.current = setInterval(
      () => setPageIndex((i) => (i + 1) % totalPages),
      rotationInterval,
    );
    return () => { if (rotationTimer.current) clearInterval(rotationTimer.current); };
  }, [rotationInterval, totalPages]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div
      className={`flex flex-col justify-center h-screen py-16 px-4 md:px-16 bg-white text-black ${scrollable ? "overflow-y-auto" : "overflow-hidden"}`}
      ref={tableRef}
      onClick={(e) => {
        if (e.clientY > window.innerHeight * 0.75) setShowControls(prev => !prev);
      }}
      onMouseMove={() => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        if (showControls) hideTimer.current = setTimeout(() => setShowControls(false), 5000);
      }}
    >
      <div className="hidden md:flex flex-col flex-1 min-h-0">
        <table className={`w-full border-collapse table-fixed ${scrollable ? "" : "h-full"}`} style={{ fontSize }}>
          <thead>
            <tr className="bg-white text-center font-semibold" style={{ fontSize: headerSize }}>
              <th className="p-2 w-[46%]">Awards</th>
              <th className="p-2 w-[16%]">Awards Night</th>
              <th className="p-2 w-[20%]">Awards Night Starts In</th>
              <th className="p-2 w-[18%]">Submission Close In</th>
            </tr>
          </thead>

          <tbody>
            {displayedAwards.map((award, idx) => (
              <tr key={award.id || idx} className="text-center border-b border-gray-100" style={{ height: `${rowHeight}vh` }}>
                {/* Award Title + Image */}
                <td className="p-2">
                  <div className="flex items-center gap-3 justify-start">
                    {award.image && (
                      <Image
                        src={award.image}
                        alt={award.title}
                        width={imgSize * 2}
                        height={imgSize}
                        className="object-contain flex-shrink-0 rounded-md"
                        style={{ height: imgSize, width: "auto", maxWidth: imgSize * 2 }}
                        unoptimized
                      />
                    )}
                    <div className="text-left">
                      <span className="uppercase" dangerouslySetInnerHTML={{ __html: award.title }} />
                      {(award.city || award.contactPerson) && (
                        <p className="text-gray-500 uppercase" style={{ fontSize: `clamp(0.45rem, ${3.5 / count}vw, 1.3rem)` }}>
                          {[award.city, award.contactPerson].filter(Boolean).join(" | ")}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Awards Night Date */}
                <td className="p-2 uppercase">{formatDate(award.field_date)}</td>

                {/* Awards Night Countdown */}
                <td className="p-2">
                  <Countdown target={award.field_date} done="Awards Ended" />
                </td>

                {/* Submission Close */}
                <td className="p-2">{getSubmissionClose(award.endDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col md:hidden flex-1 min-h-0 gap-2 overflow-y-auto">
        {displayedAwards.map((award, idx) => (
          <div key={award.id || idx} className="text-center bg-gray-100 p-3 rounded-md flex-1 flex flex-col justify-center" style={{ fontSize }}>
            {/* Award Title + Image */}
            <div className="flex flex-col items-center gap-2 p-2 font-bold" style={{ fontSize: `clamp(0.9rem, ${4.5 / count}vw, 2.5rem)` }}>
              {award.image && (
                <Image
                  src={award.image}
                  alt={award.title}
                  width={imgSize * 2}
                  height={imgSize}
                  className="object-contain rounded-md"
                  style={{ height: imgSize, width: "auto", maxWidth: imgSize * 2 }}
                  unoptimized
                />
              )}
              <span className="uppercase" dangerouslySetInnerHTML={{ __html: award.title }} />
              {(award.city || award.contactPerson) && (
                <span className="uppercase text-gray-500" style={{ fontSize: `clamp(0.5rem, ${2 / count}vw, 1.2rem)` }}>
                  {[award.city, award.contactPerson].filter(Boolean).join(" | ")}
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row">
              <div className="flex justify-evenly flex-1">
                {/* Awards Night Date */}
                <div className="p-1 flex flex-col">
                  <p className="text-gray-700" style={{ fontSize: `clamp(0.5rem, ${2 / count}vw, 1.2rem)` }}>Awards Night</p>
                  <p className="uppercase">{formatDate(award.field_date)}</p>
                </div>
                {/* Awards Night Countdown */}
                <div className="p-1">
                  <p className="text-gray-700" style={{ fontSize: `clamp(0.5rem, ${2 / count}vw, 1.2rem)` }}>Awards Night Starts In</p>
                  <p><Countdown target={award.field_date} done="Awards Ended" /></p>
                </div>
              </div>
              <div className="flex justify-evenly flex-1">
                {/* Submission Close */}
                <div className="p-1">
                  <p className="text-gray-700" style={{ fontSize: `clamp(0.5rem, ${2 / count}vw, 1.2rem)` }}>Submission Close In</p>
                  <p>{getSubmissionClose(award.endDate)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hidden floating control bar – click bottom 25% to toggle */}
      {showControls && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white rounded-xl shadow-lg flex flex-col md:flex-row items-center gap-3 px-4 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
            disabled={pageIndex === 0}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ◀ Prev
          </button>

          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 border-none text-sm cursor-pointer focus:outline-none [&>option]:bg-gray-800 [&>option]:text-white"
          >
            {PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n} awards</option>
            ))}
            <option value={upcomingAwards.length}>All ({upcomingAwards.length})</option>
          </select>

          <span className="text-sm text-white/60">
            {pageIndex + 1} / {totalPages}
          </span>

          <button
            onClick={() => setPageIndex((i) => Math.min(totalPages - 1, i + 1))}
            disabled={pageIndex >= totalPages - 1}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next ▶
          </button>

          <select
            value={rotationInterval}
            onChange={(e) => setRotationInterval(Number(e.target.value))}
            className="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 border-none text-sm cursor-pointer focus:outline-none [&>option]:bg-gray-800 [&>option]:text-white"
          >
            {ROTATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button
            onClick={toggleFullscreen}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
          >
            {isFullscreen ? "Exit ⛶" : "Fullscreen ⛶"}
          </button>

          <button
            onClick={() => window.location.href = "/"}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
          >
            Home
          </button>
        </div>
      )}
    </div>
  );
}
