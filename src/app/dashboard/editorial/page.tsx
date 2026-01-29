"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

const BrandDashboard = dynamic(
  () => import("@/src/components/BrandDashboard"),
  { ssr: false }
);

interface BrandEntry {
  brand: string;
  siteConfig: any;
}

export default function EditorialPage() {
  const searchParams = useSearchParams();

  /* ---------------- URL PARAMS ---------------- */
  const [rotationInterval, setRotationInterval] = useState(
    Number(searchParams.get("rotation")) || 60_000
  );

  const stripspeed =
    Number(searchParams.get("stripspeed")) || 100;

  const cardduration =
    Number(searchParams.get("cardduration")) || 4000;

  const activeNowIntervalms =
    Number(searchParams.get("activeNowIntervalms")) || 10000;

  const activeTodayIntervalms =
    Number(searchParams.get("activeTodayIntervalms")) || 60000;

  const autoFullscreen =
    searchParams.get("fullscreen") === "1";

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

  /* ---------------- STATE ---------------- */
  const [brands, setBrands] = useState<BrandEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const rotationTimer = useRef<NodeJS.Timeout | null>(null);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);

  /* ---------------- FULLSCREEN STATE ---------------- */
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setIsFullscreen(!!document.fullscreenElement);

    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  /* ---------------- CONTROLS ---------------- */
  const [showControls, setShowControls] = useState(false);

  const toggleControls = () => {
    setShowControls((prev) => !prev);

    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (!showControls) {
      hideTimer.current = setTimeout(() => setShowControls(false), 5000);
    }
  };

  const handleClickZone = (e: React.MouseEvent<HTMLDivElement>) => {
    const y = e.clientY;
    const height = window.innerHeight;
    if (y > height * 0.75) {
      toggleControls();
    }
  };

  const resetHideTimer = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 5000);
  };

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  /* ---------------- FETCH CONFIG ---------------- */
  useEffect(() => {
    let cancelled = false;

    const fetchBrands = async () => {
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL ||
          process.env.JSON_PROVIDER_URL;

        if (!baseUrl) return;

        const res = await fetch(
          `${baseUrl}/api/json-provider/dashboard-config/brand-all-properties?filter[editorial]=true`,
          { cache: "force-cache" }
        );

        const config = await res.json();
        if (cancelled) return;

        setBrands(
          Object.entries(config).map(([brand, siteConfig]) => ({
            brand,
            siteConfig,
          }))
        );
      } catch (err) {
        console.error("Failed to load brands:", err);
      }
    };

    fetchBrands();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------- ROTATION ---------------- */
  useEffect(() => {
    if (!brands.length) return;

    if (rotationInterval <= 0) return; // pause rotation if 0

    rotationTimer.current = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % brands.length);
    }, rotationInterval);

    return () => {
      if (rotationTimer.current) {
        clearInterval(rotationTimer.current);
        rotationTimer.current = null;
      }
    };
  }, [brands, rotationInterval]);

  /* ---------------- AUTO FULLSCREEN ---------------- */
  useEffect(() => {
    if (!autoFullscreen) return;

    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => { });
    }
  }, [autoFullscreen]);

  /* ---------------- LOADING ---------------- */
  if (!brands.length) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading…
      </div>
    );
  }

  const currentBrand = brands[currentIndex];

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col"
      onClick={handleClickZone}
      onMouseMove={resetHideTimer}
      onKeyDown={resetHideTimer}
      tabIndex={0} // enable key events for TV remotes
    >
      {/* ================= DASHBOARD ================= */}
      <div className="flex-1">
        <BrandDashboard
          key={currentBrand.brand}
          brand={currentBrand.brand}
          siteConfig={currentBrand.siteConfig}
          stripspeed={stripspeed}
          cardduration={cardduration}
          activeNowIntervalms={activeNowIntervalms}
          activeTodayIntervalms={activeTodayIntervalms}

        />
      </div>

      {/* ================= FLOATING CONTROLS ================= */}
      {showControls && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50
               bg-black/80 text-white rounded-xl shadow-lg
               flex items-center gap-3 px-4 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Prev */}
          <button
            onClick={() =>
              setCurrentIndex((i) => (i - 1 + brands.length) % brands.length)
            }
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
          >
            ◀ Prev
          </button>

          {/* Rotation Interval Select */}
          <div className="flex flex-col items-center">
            <label className="sr-only">Page Interval</label> {/* optional label for accessibility */}
            <select
              value={rotationInterval}
              onChange={(e) => setRotationInterval(Number(e.target.value))}
              className="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 border-none text-sm cursor-pointer focus:outline-none"
            >
              {ROTATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-black/80 text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Next */}
          <button
            onClick={() => setCurrentIndex((i) => (i + 1) % brands.length)}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
          >
            Next ▶
          </button>

          {/* Fullscreen */}
          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => { });
              } else {
                document.exitFullscreen().catch(() => { });
              }
            }}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
          >
            {isFullscreen ? "Exit ⛶" : "Fullscreen ⛶"}
          </button>

          <button
            onClick={() => {
              const params = new URLSearchParams();
              params.set("rotation", String(rotationInterval));
              params.set("stripspeed", String(stripspeed));
              params.set("cardduration", String(cardduration));
              params.set("activeTodayIntervalms", String(activeTodayIntervalms));
              params.set("activeNowIntervalms", String(activeNowIntervalms));
              if (autoFullscreen) params.set("fullscreen", "1");
              if (isFullscreen) params.set("fullscreen", "1");

              window.location.href = `/dashboard/editorial/settings?${params.toString()}`;
            }}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
          >
            ⚙ Settings
          </button>
        </div>
      )}
    </div>
  );
}
