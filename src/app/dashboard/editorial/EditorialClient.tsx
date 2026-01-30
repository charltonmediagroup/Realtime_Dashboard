"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { EDITORIAL_DEFAULTS } from "./default";

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
};

export default function EditorialPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [rotationInterval, setRotationInterval] = useState(DEFAULTS.rotation);
  const [stripspeed, setStripspeed] = useState(DEFAULTS.stripspeed);
  const [cardduration, setCardduration] = useState(DEFAULTS.cardduration);
  const [activeNowIntervalms, setActiveNowIntervalms] = useState(DEFAULTS.activeNowIntervalms);
  const [activeTodayIntervalms, setActiveTodayIntervalms] = useState(DEFAULTS.activeTodayIntervalms);
  const [autoFullscreen, setAutoFullscreen] = useState(DEFAULTS.fullscreen);

  const [brands, setBrands] = useState<BrandEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const rotationTimer = useRef<NodeJS.Timeout | null>(null);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);

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

    const fs = searchParams.get("fullscreen");
    if (fs !== null) setAutoFullscreen(fs === "1");
  }, [searchParams]);

  /* ---------------- FULLSCREEN HANDLING ---------------- */
  useEffect(() => {
    setIsFullscreen(!!document.fullscreenElement);
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  /* ---------------- FETCH BRANDS ---------------- */
  useEffect(() => {
    let cancelled = false;
    const fetchBrands = async () => {
      try {
        const baseUrl = process.env.JSON_PROVIDER_URL || process.env.NEXT_PUBLIC_BASE_URL;
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
      onClick={(e) => {
        if (e.clientY > window.innerHeight * 0.75) setShowControls(prev => !prev);
      }}
      onMouseMove={() => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setShowControls(false), 5000);
      }}
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
      />

      {
        showControls && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white rounded-xl shadow-lg flex flex-col md:flex-row items-center gap-3 px-4 py-3" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setCurrentIndex((i) => (i - 1 + brands.length) % brands.length)} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">◀ Prev</button>

            <select value={rotationInterval} onChange={(e) => setRotationInterval(Number(e.target.value))} className="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 border-none text-sm cursor-pointer focus:outline-none">
              {ROTATION_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>

            <button onClick={() => setCurrentIndex((i) => (i + 1) % brands.length)} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">Next ▶</button>

            <button onClick={() => { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => { }); else document.exitFullscreen().catch(() => { }); }} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">{isFullscreen ? "Exit ⛶" : "Fullscreen ⛶"}</button>

            <button onClick={() => {
              const params = new URLSearchParams();
              if (rotationInterval !== DEFAULTS.rotation) params.set("rotation", String(rotationInterval));
              if (stripspeed !== DEFAULTS.stripspeed) params.set("stripspeed", String(stripspeed));
              if (cardduration !== DEFAULTS.cardduration) params.set("cardduration", String(cardduration));
              if (activeTodayIntervalms !== DEFAULTS.activeTodayIntervalms) params.set("activeTodayIntervalms", String(activeTodayIntervalms));
              if (activeNowIntervalms !== DEFAULTS.activeNowIntervalms) params.set("activeNowIntervalms", String(activeNowIntervalms));
              if (autoFullscreen !== DEFAULTS.fullscreen) params.set("fullscreen", "1");
              router.push(`/dashboard/editorial/settings?${params.toString()}`);
            }} className="px-4 py-2 rounded bg-white/10 hover:bg-white/20">⚙ Settings</button>
          </div>
        )
      }
    </div >
  );
}
