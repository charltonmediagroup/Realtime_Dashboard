"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { EDITORIAL_DEFAULTS } from "./default";
import Link from "next/link";
import DashboardControls from "@/src/components/DashboardControls";

const BrandDashboard = dynamic(() => import("@/src/components/BrandDashboard"), { ssr: false });

interface BrandEntry {
  brand: string;
  siteConfig: any;
}

const ROTATION_OPTIONS = [
  { label: "Pause", value: 0 },
  { label: "30 seconds", value: 30_000 },
  { label: "1 minute", value: 60_000 },
  { label: "1 min 30 sec", value: 90_000 },
  { label: "2 minutes", value: 120_000 },
  { label: "3 minutes", value: 180_000 },
  { label: "4 minutes", value: 240_000 },
  { label: "5 minutes", value: 300_000 },
];

// Use the same defaults
const DEFAULTS = {
  rotation: 60_000,
  stripspeed: 100,
  cardduration: 4000,
  activeNowIntervalms: 10_000,
  activeTodayIntervalms: 60_000,
  fullscreen: false,
  videoDisplayTime: 30
};

export default function EditorialPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [rotationInterval, setRotationInterval] = useState(DEFAULTS.rotation);
  const [stripspeed, setStripspeed] = useState(DEFAULTS.stripspeed);
  const [cardduration, setCardduration] = useState(DEFAULTS.cardduration);
  const [activeNowIntervalms, setActiveNowIntervalms] = useState(DEFAULTS.activeNowIntervalms);
  const [activeTodayIntervalms, setActiveTodayIntervalms] = useState(DEFAULTS.activeTodayIntervalms);
  const [videoDisplayTime, setVideoDisplayTime] = useState(DEFAULTS.videoDisplayTime)
  const [autoFullscreen, setAutoFullscreen] = useState(DEFAULTS.fullscreen);

  const [brands, setBrands] = useState<BrandEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const rotationTimer = useRef<NodeJS.Timeout | null>(null);

  /* ---------------- INITIALIZE URL PARAMS ---------------- */
  useEffect(() => {
    const r = searchParams.get("rotation");
    if (r !== null && !isNaN(Number(r))) setRotationInterval(Number(r));

    const s = searchParams.get("stripspeed");
    if (s !== null && !isNaN(Number(s))) setStripspeed(Number(s));

    const c = searchParams.get("cardduration");
    if (c !== null && !isNaN(Number(c))) setCardduration(Number(c));

    const an = searchParams.get("activeNowIntervalms");
    if (an !== null && !isNaN(Number(an))) setActiveNowIntervalms(Number(an));

    const at = searchParams.get("activeTodayIntervalms");
    if (at !== null && !isNaN(Number(at))) setActiveTodayIntervalms(Number(at));

    const vdt = searchParams.get("videoDisplayTime");
    if (vdt !== null && !isNaN(Number(vdt))) setVideoDisplayTime(Number(vdt));

    const fs = searchParams.get("fullscreen");
    if (fs !== null) setAutoFullscreen(fs === "1");
  }, [searchParams]);

  /* ---------------- FETCH BRANDS ---------------- */
  useEffect(() => {
    let cancelled = false;
    const fetchBrands = async () => {
      try {
        const baseUrl = process.env.JSON_PROVIDER_URL || process.env.NEXT_PUBLIC_SITE_URL;
        if (!baseUrl) return;

        const res = await fetch(`${baseUrl}/api/json-provider/dashboard-config/brand-all-properties?filter[editorial]=true`, { cache: "force-cache" });
        const config = await res.json();
        if (cancelled) return;

        setBrands(Object.entries(config).map(([brand, siteConfig]) => ({ brand, siteConfig })));
      } catch (err) {
        console.error("Failed to load brands:", err);
      }
    };

    fetchBrands();
    return () => { cancelled = true; };
  }, []);

  /* ---------------- ROTATION ---------------- */
  useEffect(() => {
    if (!brands.length || rotationInterval <= 0) return;
    rotationTimer.current = setInterval(() => setCurrentIndex((i) => (i + 1) % brands.length), rotationInterval);
    return () => { if (rotationTimer.current) clearInterval(rotationTimer.current); };
  }, [brands, rotationInterval]);

  /* ---------------- AUTO FULLSCREEN ---------------- */
  useEffect(() => {
    if (!autoFullscreen) return;
    document.documentElement.requestFullscreen().catch(() => { });
  }, [autoFullscreen]);

  /* ---------------- RENDER ---------------- */
  if (!brands.length) return <div className="h-screen flex items-center justify-center">Loading…</div>;

  const currentBrand = brands[currentIndex];

  return (
    <div
      className="flex flex-col w-screen md:min-h-screen md:overflow-hidden overflow-y-auto overflow-x-hidden"
      tabIndex={0}
    >
      {/* BrandDashboard takes full width */}
      <BrandDashboard
        key={currentBrand.brand}
        brand={currentBrand.brand}
        siteConfig={currentBrand.siteConfig}
        stripspeed={stripspeed}
        cardduration={cardduration}
        activeNowIntervalms={activeNowIntervalms}
        activeTodayIntervalms={activeTodayIntervalms}
        videoDurationTime={videoDisplayTime}
      />

      <DashboardControls>
        <button onClick={() => setCurrentIndex((i) => (i - 1 + brands.length) % brands.length)} className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60">◀ Prev</button>
        <select value={rotationInterval} onChange={(e) => setRotationInterval(Number(e.target.value))} className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60 [&>option]:bg-gray-800 [&>option]:text-white">
          {ROTATION_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <button onClick={() => setCurrentIndex((i) => (i + 1) % brands.length)} className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60">Next ▶</button>
        <button onClick={() => {
          const params = new URLSearchParams();
          if (rotationInterval !== DEFAULTS.rotation) params.set("rotation", String(rotationInterval));
          if (stripspeed !== DEFAULTS.stripspeed) params.set("stripspeed", String(stripspeed));
          if (cardduration !== DEFAULTS.cardduration) params.set("cardduration", String(cardduration));
          if (activeTodayIntervalms !== DEFAULTS.activeTodayIntervalms) params.set("activeTodayIntervalms", String(activeTodayIntervalms));
          if (activeNowIntervalms !== DEFAULTS.activeNowIntervalms) params.set("activeNowIntervalms", String(activeNowIntervalms));
          if (videoDisplayTime !== DEFAULTS.videoDisplayTime) params.set("videoDisplayTime", String(videoDisplayTime));
          if (autoFullscreen !== DEFAULTS.fullscreen) params.set("fullscreen", "1");
          router.push(`/dashboard/editorial/settings?${params.toString()}`);
        }} className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60">⚙ Settings</button>
        <div className="flex flex-col gap-1">
          <Link href="/dashboard/editorial/shorts" className="px-4 py-1 rounded bg-black/40 text-white hover:bg-black/60 text-center text-sm">Shorts</Link>
          <Link href="/dashboard/editorial/videos" className="px-4 py-1 rounded bg-black/40 text-white hover:bg-black/60 text-center text-sm">Videos</Link>
        </div>
      </DashboardControls>
    </div >
  );
}
