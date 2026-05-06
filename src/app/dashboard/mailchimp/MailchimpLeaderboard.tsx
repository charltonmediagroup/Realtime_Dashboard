"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardControls from "@/src/components/DashboardControls";
import {
  LEAD_SOURCE_BUCKETS,
  type AudienceMovement,
  type LeadSourceBucket,
  type LeadSourceMovement,
  type MailchimpAudienceStats,
} from "@/src/lib/sources/mailchimpTypes";

const MC_BLACK = "#000000";
const MC_YELLOW = "#FFE01B";
const MC_INK = "#1a1a1a";
const MC_MUTED = "#6b6b6b";
const MC_RED = "#9b1c1c";
const ALT_ROW_BG = "#fafafa";
const ROW_BORDER = "#e5e5e5";
const CHIP_BG = "#fff7c2";

const PAGE_OPTIONS = [3, 4, 5, 6];
const ROTATION_OPTIONS = [
  { label: "Pause", value: 0 },
  { label: "30 seconds", value: 30_000 },
  { label: "1 minute", value: 60_000 },
  { label: "2 minutes", value: 120_000 },
  { label: "5 minutes", value: 300_000 },
];

const REFRESH_INTERVAL_MS = 30 * 60 * 1000;
const TOP_LEAD_SOURCES = 3;

type Props = {
  audiences: MailchimpAudienceStats[];
  engagement: MailchimpAudienceStats[];
  movement: {
    perAudience: AudienceMovement[];
    totals: Record<LeadSourceBucket, LeadSourceMovement>;
    grandTotals: { subscribed: number; unsubscribed: number; cleaned: number };
    windowDays: number;
  };
};

type CombinedRow = {
  key: string;
  title: string;
  listName: string | null;
  members: number;
  unsubsLifetime: number;
  cleanedLifetime: number;
  openRate: number | null;
  clickRate: number | null;
  unsubRate: number | null;
  byBucket: Record<LeadSourceBucket, LeadSourceMovement>;
  windowSubs: number;
  windowUnsubs: number;
  windowCleaned: number;
  windowNet: number;
  error: string | null;
};

function fmt(n: number): string {
  return n.toLocaleString();
}
function fmtPct(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  return `${v.toFixed(2)}%`;
}
function avg(arr: number[]): number | null {
  if (arr.length === 0) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function buildCombinedRows(
  audiences: MailchimpAudienceStats[],
  engagement: MailchimpAudienceStats[],
  perAudience: AudienceMovement[],
): CombinedRow[] {
  // Index engagement and movement by listId so we can join on the audience list.
  const engById = new Map(engagement.map((e) => [e.listId, e]));
  const movById = new Map(perAudience.map((m) => [m.listId, m]));
  const empty = (): Record<LeadSourceBucket, LeadSourceMovement> => {
    const out = {} as Record<LeadSourceBucket, LeadSourceMovement>;
    for (const b of LEAD_SOURCE_BUCKETS) {
      out[b] = { bucket: b, subscribed: 0, unsubscribed: 0, cleaned: 0 };
    }
    return out;
  };
  return audiences.map((a) => {
    const eng = engById.get(a.listId);
    const mov = movById.get(a.listId);
    const byBucket = mov?.byBucket ?? empty();
    const w = mov?.totals ?? { subscribed: 0, unsubscribed: 0, cleaned: 0 };
    return {
      key: `${a.title}-${a.listId}`,
      title: a.title,
      listName: a.listName,
      members: a.memberCount,
      unsubsLifetime: a.unsubscribeCount,
      cleanedLifetime: a.cleanedCount,
      openRate: eng?.openRate ?? a.openRate,
      clickRate: eng?.clickRate ?? a.clickRate,
      unsubRate: eng?.unsubscribeRate ?? a.unsubscribeRate,
      byBucket,
      windowSubs: w.subscribed,
      windowUnsubs: w.unsubscribed,
      windowCleaned: w.cleaned,
      windowNet: w.subscribed - w.unsubscribed - w.cleaned,
      error: a.error || mov?.error || null,
    };
  });
}

export default function MailchimpLeaderboard({ audiences, engagement, movement }: Props) {
  const router = useRouter();

  const rows = useMemo(
    () => buildCombinedRows(audiences, engagement, movement.perAudience),
    [audiences, engagement, movement.perAudience],
  );

  const [pageSize, setPageSize] = useState<number>(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? 4 : 6,
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [rotationInterval, setRotationInterval] = useState(60_000);
  const rotationTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const displayed = rows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  const padded: (CombinedRow | null)[] = [...displayed];
  while (padded.length < pageSize) padded.push(null);

  // Auto-rotate pages.
  useEffect(() => {
    if (rotationTimer.current) clearInterval(rotationTimer.current);
    if (rotationInterval <= 0 || totalPages <= 1) return;
    rotationTimer.current = setInterval(
      () => setPageIndex((i) => (i + 1) % totalPages),
      rotationInterval,
    );
    return () => {
      if (rotationTimer.current) clearInterval(rotationTimer.current);
    };
  }, [rotationInterval, totalPages]);

  // Auto-refresh data — server component re-reads cache on router.refresh.
  useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  // Viewport-scaled sizing — same clamp formula family as the editorial leaderboard.
  const count = pageSize || 1;
  const eff = Math.min(count + 1, 12);
  const rowHeightVh = 70 / (count + 1);
  const fontSize = `clamp(0.8rem, min(calc(0.55vw + ${6 / eff}vw), ${rowHeightVh * 0.3}vh), 2.6rem)`;
  const headerSize = `clamp(0.65rem, min(calc(0.35vw + ${4 / eff}vw), ${rowHeightVh * 0.18}vh), 1.4rem)`;
  const chipSize = `clamp(0.6rem, min(calc(0.3vw + ${3 / eff}vw), ${rowHeightVh * 0.16}vh), 1.1rem)`;
  const totalBigSize = `clamp(1rem, calc(0.6vw + ${7 / eff}vw), 2.6rem)`;

  // Aggregate footer numbers.
  const okRows = rows.filter((r) => !r.error);
  const totalSubs = okRows.reduce((s, r) => s + r.members, 0);
  const avgOpen = avg(okRows.filter((r) => r.openRate !== null).map((r) => r.openRate!));
  const avgClick = avg(okRows.filter((r) => r.clickRate !== null).map((r) => r.clickRate!));
  const avgUnsubRate = avg(okRows.filter((r) => r.unsubRate !== null).map((r) => r.unsubRate!));

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: "#ffffff", color: MC_INK }}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
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
      {/* Single combined table */}
      <div className="flex-1 min-h-0 px-0 md:px-6 flex flex-col">
        <table
          className="w-full border-collapse table-fixed h-full"
          style={{ fontSize }}
        >
          <thead>
            <tr
              className="text-left font-bold uppercase"
              style={{
                fontSize: headerSize,
                background: MC_BLACK,
                color: "#fff",
                letterSpacing: "0.10em",
              }}
            >
              <th className="px-3 sm:px-4 py-3 w-[26%]">Audience</th>
              <th className="px-2 py-3 w-[10%] text-right">Subscribers</th>
              <th className="px-2 py-3 w-[7%] text-right">Open</th>
              <th className="px-2 py-3 w-[7%] text-right">Click</th>
              <th className="px-2 py-3 w-[7%] text-right">Unsub</th>
              <th className="px-2 py-3 w-[6%] text-right">+ {movement.windowDays}d</th>
              <th className="px-2 py-3 w-[6%] text-right">− Uns</th>
              <th className="px-2 py-3 w-[6%] text-right">− Cln</th>
              <th className="px-3 sm:px-4 py-3 w-[8%] text-right">Net</th>
            </tr>
            <tr>
              <td colSpan={9} style={{ padding: 0, height: 3, background: MC_YELLOW }} />
            </tr>
          </thead>
          <tbody>
            {padded.map((row, idx) => (
              <CombinedRowView
                key={row ? row.key : `empty-${idx}`}
                row={row}
                idx={idx}
                rowHeightVh={rowHeightVh}
                chipSize={chipSize}
              />
            ))}
            {/* Footer total row */}
            <tr
              style={{
                height: `${rowHeightVh}vh`,
                minHeight: 50,
                background: `linear-gradient(90deg, #ffffff, ${ALT_ROW_BG})`,
                borderTop: `2px solid ${MC_YELLOW}`,
              }}
            >
              <td
                className="px-3 sm:px-4 py-2 uppercase font-bold align-middle"
                style={{ color: MC_BLACK, letterSpacing: "0.14em", fontSize: totalBigSize }}
              >
                Total
              </td>
              <td
                className="px-2 py-2 text-right font-mono font-bold align-middle tabular-nums"
                style={{ color: MC_BLACK, fontSize: totalBigSize }}
              >
                {fmt(totalSubs)}
              </td>
              <td
                className="px-2 py-2 text-right font-mono align-middle tabular-nums"
                style={{ color: MC_INK }}
              >
                {fmtPct(avgOpen)}
              </td>
              <td
                className="px-2 py-2 text-right font-mono align-middle tabular-nums"
                style={{ color: MC_INK }}
              >
                {fmtPct(avgClick)}
              </td>
              <td
                className="px-2 py-2 text-right font-mono align-middle tabular-nums"
                style={{ color: MC_INK }}
              >
                {fmtPct(avgUnsubRate)}
              </td>
              <td
                className="px-2 py-2 text-right font-mono font-bold align-middle tabular-nums"
                style={{ color: MC_BLACK }}
              >
                +{fmt(movement.grandTotals.subscribed)}
              </td>
              <td
                className="px-2 py-2 text-right font-mono align-middle tabular-nums"
                style={{ color: MC_RED }}
              >
                −{fmt(movement.grandTotals.unsubscribed)}
              </td>
              <td
                className="px-2 py-2 text-right font-mono align-middle tabular-nums"
                style={{ color: MC_RED }}
              >
                −{fmt(movement.grandTotals.cleaned)}
              </td>
              <td
                className="px-3 sm:px-4 py-2 text-right font-mono font-bold align-middle tabular-nums"
                style={{
                  color:
                    movement.grandTotals.subscribed -
                      movement.grandTotals.unsubscribed -
                      movement.grandTotals.cleaned >=
                    0
                      ? MC_BLACK
                      : MC_RED,
                  fontSize: totalBigSize,
                }}
              >
                {signedFmt(
                  movement.grandTotals.subscribed -
                    movement.grandTotals.unsubscribed -
                    movement.grandTotals.cleaned,
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <DashboardControls>
        <button
          onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
          disabled={pageIndex === 0}
          className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ◀ Prev
        </button>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPageIndex(0);
          }}
          className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60 [&>option]:bg-gray-800 [&>option]:text-white"
        >
          {PAGE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              Show {n}
            </option>
          ))}
          <option value={Math.max(rows.length, 1)}>Show All ({rows.length})</option>
        </select>
        <span className="text-sm text-white/80">
          {Math.min(pageIndex + 1, totalPages)} / {totalPages}
        </span>
        <button
          onClick={() => setPageIndex((i) => Math.min(totalPages - 1, i + 1))}
          disabled={pageIndex >= totalPages - 1}
          className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next ▶
        </button>
        <select
          value={rotationInterval}
          onChange={(e) => setRotationInterval(Number(e.target.value))}
          className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60 [&>option]:bg-gray-800 [&>option]:text-white"
        >
          {ROTATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Rotate · {opt.label}
            </option>
          ))}
        </select>
      </DashboardControls>
    </div>
  );
}

function signedFmt(n: number): string {
  return `${n >= 0 ? "+" : ""}${fmt(n)}`;
}

function CombinedRowView({
  row,
  idx,
  rowHeightVh,
  chipSize,
}: {
  row: CombinedRow | null;
  idx: number;
  rowHeightVh: number;
  chipSize: string;
}) {
  const buckets = row
    ? LEAD_SOURCE_BUCKETS.map((b) => row.byBucket[b])
        .filter((b) => b.subscribed + b.unsubscribed + b.cleaned > 0)
        .sort((a, b) => b.subscribed - a.subscribed)
        .slice(0, TOP_LEAD_SOURCES)
    : [];
  return (
    <tr
      style={{
        height: `${rowHeightVh}vh`,
        minHeight: 60,
        backgroundColor: idx % 2 === 0 ? "#ffffff" : ALT_ROW_BG,
        borderBottom: `1px solid ${ROW_BORDER}`,
      }}
    >
      <td className="px-3 sm:px-4 py-2 align-middle">
        {row && (
          <div className="flex flex-col gap-1">
            <span
              className="font-bold uppercase leading-tight"
              style={{ color: MC_BLACK, letterSpacing: "0.04em" }}
              title={row.title}
            >
              {row.title}
            </span>
            {buckets.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {buckets.map((b) => (
                  <span
                    key={b.bucket}
                    className="inline-flex items-baseline gap-1 uppercase font-semibold tracking-wider"
                    style={{
                      fontSize: chipSize,
                      background: CHIP_BG,
                      color: MC_BLACK,
                      border: `1px solid ${MC_YELLOW}`,
                      padding: "1px 8px",
                      borderRadius: 9999,
                      lineHeight: 1.4,
                    }}
                    title={`+${b.subscribed} · −${b.unsubscribed} unsubs · −${b.cleaned} cleaned`}
                  >
                    <span>{b.bucket}</span>
                    <span className="font-mono" style={{ color: MC_INK }}>
                      +{b.subscribed}
                    </span>
                  </span>
                ))}
              </div>
            )}
            {row.error && (
              <span
                className="inline-block uppercase font-semibold tracking-wider"
                style={{
                  fontSize: chipSize,
                  background: "#ffe4e4",
                  color: "#9b1c1c",
                  border: `1px solid #f5b5b5`,
                  padding: "1px 8px",
                  borderRadius: 9999,
                  width: "fit-content",
                }}
              >
                Error
              </span>
            )}
          </div>
        )}
      </td>
      <td
        className="px-2 py-2 text-right font-mono font-bold align-middle tabular-nums"
        style={{ color: MC_BLACK, fontSize: "1.2em" }}
      >
        {row ? (row.error ? "—" : fmt(row.members)) : ""}
      </td>
      <td
        className="px-2 py-2 text-right font-mono align-middle tabular-nums"
        style={{ color: MC_INK }}
      >
        {row ? (row.error ? "—" : fmtPct(row.openRate)) : ""}
      </td>
      <td
        className="px-2 py-2 text-right font-mono align-middle tabular-nums"
        style={{ color: MC_INK }}
      >
        {row ? (row.error ? "—" : fmtPct(row.clickRate)) : ""}
      </td>
      <td
        className="px-2 py-2 text-right font-mono align-middle tabular-nums"
        style={{ color: MC_INK }}
      >
        {row ? (row.error ? "—" : fmtPct(row.unsubRate)) : ""}
      </td>
      <td
        className="px-2 py-2 text-right font-mono font-bold align-middle tabular-nums"
        style={{ color: MC_BLACK }}
      >
        {row ? (row.windowSubs ? `+${fmt(row.windowSubs)}` : "0") : ""}
      </td>
      <td
        className="px-2 py-2 text-right font-mono align-middle tabular-nums"
        style={{ color: row?.windowUnsubs ? MC_RED : MC_MUTED }}
      >
        {row ? (row.windowUnsubs ? `−${fmt(row.windowUnsubs)}` : "0") : ""}
      </td>
      <td
        className="px-2 py-2 text-right font-mono align-middle tabular-nums"
        style={{ color: row?.windowCleaned ? MC_RED : MC_MUTED }}
      >
        {row ? (row.windowCleaned ? `−${fmt(row.windowCleaned)}` : "0") : ""}
      </td>
      <td
        className="px-3 sm:px-4 py-2 text-right font-mono font-bold align-middle tabular-nums"
        style={{
          color: row && row.windowNet < 0 ? MC_RED : MC_BLACK,
          fontSize: "1.15em",
        }}
      >
        {row ? signedFmt(row.windowNet) : ""}
      </td>
    </tr>
  );
}
