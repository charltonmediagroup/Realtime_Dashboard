"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
// Tablets (iPads) have the height to fit more rows per page than desktop/TV want.
const TABLET_PAGE_OPTIONS = [6, 8];
const ROTATION_OPTIONS = [
  { label: "Pause", value: 0 },
  { label: "30 seconds", value: 30_000 },
  { label: "1 minute", value: 60_000 },
  { label: "2 minutes", value: 120_000 },
  { label: "5 minutes", value: 300_000 },
];

const REFRESH_INTERVAL_MS = 30 * 60 * 1000;
const TOP_LEAD_SOURCES = 3;

// Short chip labels for phone portrait, where the long bucket names dominate the
// narrow Audience column. Only the long ones are abbreviated; the rest pass through.
const BUCKET_SHORT: Record<string, string> = {
  "Newsletter sign-up": "Newsletter",
  "Top banks / companies": "Top banks",
};

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

  // Must be a constant for the initial render so SSR and the first client render
  // agree (no hydration mismatch). Phone portrait ignores pageSize (it uses the
  // phoneShowAll toggle below), so this is only the desktop/TV default.
  const [pageSize, setPageSize] = useState(6);
  // Phone portrait packs the same wide table into a narrow column, so the Audience
  // cell (title + chips + error) wraps tall and used to overlap the next row.
  // Track phone width to shrink the per-row detail and clip the cell (below).
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    // Portrait-only: a phone held in landscape must use the landscape (fit) layout,
    // not the portrait scroll layout. Without the orientation clause a small/narrow
    // landscape phone (or a browser that reports a sub-767px landscape width, which
    // Chrome and Safari disagree on) would wrongly get the scrollable portrait grid.
    const mq = window.matchMedia("(max-width: 767px) and (orientation: portrait)");
    const apply = () => setIsPhone(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  // Landscape phones are wider than the 767px portrait breakpoint, so they fall
  // through to the desktop table. Detect them (landscape + phone-width, excluding
  // tablets/desktop ≥ 950px) to pin the table to the real visible height and size
  // each Show-N page to fit — `h-screen`/`vh` resolve to the toolbar-hidden
  // (taller) height on mobile, so a page's rows overran the short landscape view.
  const [isLandscapePhone, setIsLandscapePhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape) and (max-width: 950px)");
    const apply = () => setIsLandscapePhone(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  // Tablets (iPads): touch + at least tablet width. They use the desktop layout but
  // get a larger Show-N set since the taller screen fits more rows. `pointer: coarse`
  // keeps desktop/TV (mouse) out; the phone checks above take precedence so a
  // landscape phone never lands here.
  const [isTablet, setIsTablet] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse) and (min-width: 768px)");
    const apply = () => setIsTablet(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  // Phone portrait offers only two layouts (the full Show-N control is desktop/TV
  // only): "Show 10" sizes rows so ~10 fit and you scroll for the rest, "Show All"
  // renders every brand at its natural height. Both scroll with the header, Total
  // and Audience column frozen.
  const [phoneShowAll, setPhoneShowAll] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [rotationInterval, setRotationInterval] = useState(60_000);
  const rotationTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);

  // The real visible height (toolbar-aware) so phone portrait can be pinned to it
  // and fit-to-screen — h-screen / vh resolve to the toolbar-hidden (taller)
  // height on mobile, which made the page scroll. visualViewport.height is the
  // true visible height; re-measure on the next frame + after a tick so it
  // settles on a fresh navigation.
  const [viewportH, setViewportH] = useState<number | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
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

  // Lock document scroll on phones/tablets so the fit-to-screen page can't be dragged.
  useEffect(() => {
    if (!isPhone && !isLandscapePhone && !isTablet) return;
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
  }, [isPhone, isLandscapePhone, isTablet]);

  // Phone portrait shows every brand in one vertically-scrollable list (frozen
  // Audience column + pinned header/Total); desktop/TV keep the paged page-size
  // control. `perPage` drives both pagination and the row sizing below.
  const perPage = isPhone ? Math.max(rows.length, 1) : pageSize;

  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const displayed = rows.slice(pageIndex * perPage, (pageIndex + 1) * perPage);
  const padded: (CombinedRow | null)[] = [...displayed];
  while (padded.length < perPage) padded.push(null);

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
  const count = perPage || 1;
  const eff = Math.min(count + 1, 12);
  const rowHeightVh = 70 / (count + 1);
  // Landscape phone keeps the desktop Show-N paging, but sizes the current page's
  // rows + Total in px off the real visible height so they fit without scrolling
  // (0.86 leaves room for the header row). count = pageSize here. Computed up here
  // so the fonts can scale to it.
  //
  // `!isPhone` makes portrait win: a portrait-width phone (< 767px) must never take
  // this landscape path. Dividing the TALL portrait viewport by a few rows yields
  // huge fonts, and the orientation media query can get stuck "landscape" across
  // rotations on mobile Safari — which would otherwise blow up the portrait layout.
  const landscapeRowH =
    isLandscapePhone && !isPhone && viewportH != null
      ? Math.max(1, Math.round((viewportH * 0.86) / (count + 1)))
      : null;
  // Tablets use the desktop layout, but `h-screen` (100vh) resolves to the
  // toolbar-hidden (taller) viewport on iPad Safari, so the bottom of the table
  // (the Total) ran past the visible area and its text clipped. Pin tablets to the
  // real visible height and size every row in px off it so the page — Total
  // included — always fits. count = pageSize (or all on Show All).
  const tabletRowH =
    isTablet && !isLandscapePhone && viewportH != null
      ? Math.max(1, Math.round((viewportH * 0.9) / (count + 1)))
      : null;
  // Font sizing. Portrait phones use small rem clamps. Landscape phones scale every
  // font to the fit row height (px) so a Show-N page's rows never grow past their
  // slot and clip. Desktop/TV keep the original vh/vw clamps.
  const fontSize =
    landscapeRowH != null
      ? `${Math.max(8, Math.round(landscapeRowH * 0.34))}px`
      : isPhone
        ? `clamp(0.5rem, min(calc(0.55vw + ${6 / eff}vw), ${rowHeightVh * 0.3}vh), 0.95rem)`
        : `clamp(0.8rem, min(calc(0.55vw + ${6 / eff}vw), ${rowHeightVh * 0.3}vh), 2.6rem)`;
  const headerSize =
    landscapeRowH != null
      ? `${Math.max(7, Math.round(landscapeRowH * 0.26))}px`
      : isPhone
        ? `clamp(0.45rem, min(calc(0.35vw + ${4 / eff}vw), ${rowHeightVh * 0.18}vh), 0.8rem)`
        : `clamp(0.65rem, min(calc(0.35vw + ${4 / eff}vw), ${rowHeightVh * 0.18}vh), 1.4rem)`;
  const chipSize =
    landscapeRowH != null
      ? `${Math.max(6, Math.round(landscapeRowH * 0.2))}px`
      : isPhone
        ? `clamp(0.42rem, min(calc(0.25vw + ${2.4 / eff}vw), ${rowHeightVh * 0.16}vh), 0.56rem)`
        : `clamp(0.6rem, min(calc(0.3vw + ${3 / eff}vw), ${rowHeightVh * 0.16}vh), 1.1rem)`;
  const totalBigSize =
    landscapeRowH != null
      ? `${Math.max(9, Math.round(landscapeRowH * 0.4))}px`
      : isPhone
        ? `clamp(0.7rem, calc(0.6vw + ${7 / eff}vw), 1.1rem)`
        : `clamp(1rem, calc(0.6vw + ${7 / eff}vw), 2.6rem)`;
  // Shrink the emphasized numeric cells (Subscribers / Net) on phones/landscape —
  // at desktop they're enlarged, which on a small screen pushes them out of place.
  const numEm = isPhone || isLandscapePhone ? "1em" : undefined;
  // "Show All" with every brand on one screen leaves rows too thin to fit chips.
  // Landscape phone and tablet (desktop layout, no scroll) both hit this, so hide
  // the chips and clamp the name to one line there so rows can shrink to fit.
  const landscapeShowAll = isLandscapePhone && pageSize >= Math.max(rows.length, 1);
  const tabletShowAll =
    isTablet && !isLandscapePhone && pageSize >= Math.max(rows.length, 1);
  const chipsToShow = landscapeShowAll || tabletShowAll ? 0 : TOP_LEAD_SOURCES;
  // Compact chip styling + abbreviations for the cramped mobile views. The title
  // clamps to 2 lines in portrait, 1 line in (short) landscape / tablet Show All,
  // unclamped on desktop/TV and tablet at fixed page sizes.
  const compact = isPhone || isLandscapePhone;
  const titleLines = isPhone ? 2 : isLandscapePhone || tabletShowAll ? 1 : 0;
  // Phone "Show 10": size rows so ~10 fit the screen at once; every brand is still
  // rendered, so the rest are reached by scrolling while the header + Total stay
  // pinned (sticky cells in globals.css) and the Audience column stays frozen.
  // Divide the real visible height (viewportH) by 11 = 10 rows + the Total. Phone
  // "Show All" and desktop/TV fall through to natural/vh sizing.
  const PHONE_VISIBLE_ROWS = 10;
  const phoneRowH =
    isPhone && !phoneShowAll && viewportH != null
      ? Math.max(1, Math.round((viewportH * 0.9) / (PHONE_VISIBLE_ROWS + 1)))
      : null;
  const rowHeightCss =
    phoneRowH != null
      ? `${phoneRowH}px`
      : isPhone
        ? "auto"
        : landscapeRowH != null
          ? `${landscapeRowH}px`
          : tabletRowH != null
            ? `${tabletRowH}px`
            : `${rowHeightVh}vh`;
  const rowMinH =
    phoneRowH != null
      ? `${phoneRowH}px`
      : landscapeRowH != null
        ? `${landscapeRowH}px`
        : tabletRowH != null
          ? `${tabletRowH}px`
          : undefined;
  // Cap the Audience cell to its row so its content (name + chips) can't push the
  // row taller and clip the rows below / the Total. Applies to landscape and all
  // tablet sizes (both pinned/fit layouts). Portrait scrolls, so it's uncapped there.
  const cellMaxH =
    landscapeRowH != null
      ? `${landscapeRowH}px`
      : tabletRowH != null
        ? `${tabletRowH}px`
        : undefined;

  // Aggregate footer numbers.
  const okRows = rows.filter((r) => !r.error);
  const totalSubs = okRows.reduce((s, r) => s + r.members, 0);
  const avgOpen = avg(okRows.filter((r) => r.openRate !== null).map((r) => r.openRate!));
  const avgClick = avg(okRows.filter((r) => r.clickRate !== null).map((r) => r.clickRate!));
  const avgUnsubRate = avg(okRows.filter((r) => r.unsubRate !== null).map((r) => r.unsubRate!));

  // Pin the page to the real visible height on any phone (portrait or landscape)
  // so it's fit-to-screen instead of using the toolbar-hidden `h-screen`.
  const pinViewport = (isPhone || isLandscapePhone || isTablet) && viewportH != null;

  return (
    <div
      className={`flex flex-col overflow-hidden ${
        pinViewport ? "fixed inset-x-0 top-0" : "h-screen"
      }`}
      style={{
        background: "#ffffff",
        color: MC_INK,
        ...(pinViewport ? { height: viewportH } : {}),
      }}
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
      {/* Single combined table. On phone portrait the Audience column stays frozen
          (sticky-left) with the header + Total pinned (sticky top/bottom, see
          globals.css), so the body scrolls both ways to reveal every brand and
          every metric column. */}
      <div
        className={`flex-1 min-h-0 px-0 md:px-6 flex flex-col ${
          isPhone
            ? "overflow-auto"
            : isLandscapePhone || isTablet
              ? "overflow-hidden"
              : ""
        }`}
      >
        <table
          className="mc-table w-full border-collapse table-fixed h-full"
          style={{ fontSize, ...(isPhone ? { minWidth: 680 } : {}) }}
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
              <th
                className="px-3 sm:px-4 py-3 w-[26%]"
                style={isPhone ? { width: 128 } : undefined}
              >
                Audience
              </th>
              <th className="px-2 py-3 w-[10%] text-right">Subscribers</th>
              <th className="px-2 py-3 w-[7%] text-right">Open</th>
              <th className="px-2 py-3 w-[7%] text-right">Click</th>
              <th className="px-2 py-3 w-[7%] text-right">Unsub</th>
              <th className="px-2 py-3 w-[6%] text-right">+ {movement.windowDays}d</th>
              <th className="px-2 py-3 w-[6%] text-right">− Uns</th>
              <th className="px-2 py-3 w-[6%] text-right">− Cln</th>
              <th className="px-3 sm:px-4 py-3 w-[8%] text-right">Net</th>
            </tr>
            {!isPhone && (
              <tr>
                <td colSpan={9} style={{ padding: 0, height: 3, background: MC_YELLOW }} />
              </tr>
            )}
          </thead>
          <tbody>
            {padded.map((row, idx) => (
              <CombinedRowView
                key={row ? row.key : `empty-${idx}`}
                row={row}
                idx={idx}
                rowHeight={rowHeightCss}
                rowMinH={rowMinH}
                chipSize={chipSize}
                compact={compact}
                titleLines={titleLines}
                chipsToShow={chipsToShow}
                cellMaxH={cellMaxH}
                numEm={numEm}
              />
            ))}
            {/* Footer total row */}
            <tr
              style={{
                height: rowHeightCss,
                minHeight: rowMinH ?? 50,
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
        {isPhone ? (
          <select
            value={phoneShowAll ? "all" : "10"}
            onChange={(e) => {
              setPhoneShowAll(e.target.value === "all");
              setPageIndex(0);
            }}
            className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60 [&>option]:bg-gray-800 [&>option]:text-white"
          >
            <option value="10">Show 10</option>
            <option value="all">Show All ({rows.length})</option>
          </select>
        ) : isLandscapePhone ? (
          // Landscape phone: only the larger page sizes fit the short height.
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPageIndex(0);
            }}
            className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60 [&>option]:bg-gray-800 [&>option]:text-white"
          >
            <option value={6}>Show 6</option>
            <option value={10}>Show 10</option>
            <option value={Math.max(rows.length, 1)}>Show All ({rows.length})</option>
          </select>
        ) : isTablet ? (
          // Tablet (iPad): larger page sizes since the screen fits more rows.
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPageIndex(0);
            }}
            className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60 [&>option]:bg-gray-800 [&>option]:text-white"
          >
            {TABLET_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                Show {n}
              </option>
            ))}
            <option value={Math.max(rows.length, 1)}>Show All ({rows.length})</option>
          </select>
        ) : (
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
        )}
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
  rowHeight,
  rowMinH,
  chipSize,
  compact,
  titleLines,
  chipsToShow,
  cellMaxH,
  numEm,
}: {
  row: CombinedRow | null;
  idx: number;
  rowHeight: string;
  rowMinH: string | undefined;
  chipSize: string;
  compact: boolean;
  titleLines: number;
  chipsToShow: number;
  cellMaxH: string | undefined;
  numEm: string | undefined;
}) {
  const buckets = row
    ? LEAD_SOURCE_BUCKETS.map((b) => row.byBucket[b])
        .filter((b) => b.subscribed + b.unsubscribed + b.cleaned > 0)
        .sort((a, b) => b.subscribed - a.subscribed)
        .slice(0, chipsToShow)
    : [];
  return (
    <tr
      style={{
        height: rowHeight,
        minHeight: rowMinH ?? 60,
        backgroundColor: idx % 2 === 0 ? "#ffffff" : ALT_ROW_BG,
        borderBottom: `1px solid ${ROW_BORDER}`,
      }}
    >
      <td className={`px-3 sm:px-4 py-2 ${compact ? "align-top" : "align-middle"}`}>
        {row && (
          <div
            className={`flex flex-col overflow-hidden ${compact ? "gap-0.5" : "gap-1"}`}
            style={{ maxHeight: cellMaxH }}
          >
            <span
              className="font-bold uppercase leading-tight"
              style={{
                color: MC_BLACK,
                letterSpacing: "0.04em",
                ...(titleLines > 0
                  ? ({
                      display: "-webkit-box",
                      WebkitLineClamp: titleLines,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    } as CSSProperties)
                  : {}),
              }}
              title={row.title}
            >
              {row.title}
            </span>
            {buckets.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {buckets.map((b) => (
                  <span
                    key={b.bucket}
                    className={`inline-flex items-baseline uppercase font-semibold ${
                      compact ? "gap-0.5 tracking-normal" : "gap-1 tracking-wider"
                    }`}
                    style={{
                      fontSize: chipSize,
                      background: CHIP_BG,
                      color: MC_BLACK,
                      border: `1px solid ${MC_YELLOW}`,
                      padding: compact ? "0 3px" : "1px 8px",
                      borderRadius: 9999,
                      lineHeight: compact ? 1.15 : 1.4,
                    }}
                    title={`+${b.subscribed} · −${b.unsubscribed} unsubs · −${b.cleaned} cleaned`}
                  >
                    <span>{compact ? BUCKET_SHORT[b.bucket] ?? b.bucket : b.bucket}</span>
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
        style={{ color: MC_BLACK, fontSize: numEm ?? "1.2em" }}
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
          fontSize: numEm ?? "1.15em",
        }}
      >
        {row ? signedFmt(row.windowNet) : ""}
      </td>
    </tr>
  );
}
