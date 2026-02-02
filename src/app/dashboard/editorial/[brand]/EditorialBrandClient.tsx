"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import EditorialBrandSettingsClient from "./BrandSettingsClient";

const BrandDashboard = dynamic(
  () => import("@/src/components/BrandDashboard"),
  { ssr: false }
);

interface BrandPageProps {
  brand: string;
}

export default function BrandPageClient({ brand }: BrandPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [siteConfig, setSiteConfig] = useState<any | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);

  const baseUrl =
    process.env.JSON_PROVIDER_URL || process.env.NEXT_PUBLIC_BASE_URL;

  /* ---------------- FETCH BRAND CONFIG ---------------- */
  useEffect(() => {
    if (!baseUrl) return;

    const fetchBrandConfig = async () => {
      try {
        const res = await fetch(
          `${baseUrl}/api/json-provider/dashboard-config/brand-all-properties/${brand}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("Brand not found");
        setSiteConfig(await res.json());
      } catch {
        try {
          const fallback = await fetch(
            `${baseUrl}/api/json-provider/dashboard-config/brand-all-properties/sbr`,
            { cache: "no-store" }
          );
          setSiteConfig(await fallback.json());
        } catch {
          console.error("Failed to load brand config");
        }
      }
    };

    fetchBrandConfig();
  }, [brand, baseUrl]);

  /* ---------------- DASHBOARD PARAMS ---------------- */
  const stripspeed = Number(searchParams.get("stripspeed") ?? 100);
  const cardduration = Number(searchParams.get("cardduration") ?? 4000);
  const activeNowIntervalms = Number(searchParams.get("activeNowIntervalms") ?? 10_000);
  const activeTodayIntervalms = Number(searchParams.get("activeTodayIntervalms") ?? 60_000);
  const videoDisplayTime = Number(searchParams.get("videoDisplayTime") ?? 30);
  const fullscreenParam = searchParams.get("fullscreen") === "1";

  /* ---------------- CURRENT PARAMS FOR SETTINGS ---------------- */
  const currentParams = {
    stripspeed: String(stripspeed),
    cardduration: String(cardduration),
    activeNowIntervalms: String(activeNowIntervalms),
    activeTodayIntervalms: String(activeTodayIntervalms),
    videoDisplayTime: String(videoDisplayTime),
    fullscreen: fullscreenParam ? "1" : "0",
  };

  /* ---------------- HANDLE SETTINGS SAVE ---------------- */
  const handleSettingsSave = (params: Record<string, string>) => {
    const updatedParams = new URLSearchParams();

    // Only add non-default params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") updatedParams.set(key, value);
    });

    const queryString = updatedParams.toString();
    router.push(
      queryString
        ? `/dashboard/editorial/${brand}?${queryString}`
        : `/dashboard/editorial/${brand}`
    );

    setShowSettings(false);
  };

  /* ---------------- SHOW/HIDE CONTROLS ---------------- */
  const handleUserActivity = (e: React.MouseEvent | React.TouchEvent) => {
    const clientY = "clientY" in e ? e.clientY : e.touches?.[0]?.clientY ?? 0;
    if (clientY < window.innerHeight * 0.75) return;

    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 5000);
  };

  if (!siteConfig) {
    return <div className="h-screen flex items-center justify-center">Loading…</div>;
  }

  return (
    <div
      className="flex flex-col w-screen min-h-screen overflow-hidden"
      onClick={handleUserActivity}
      onTouchStart={handleUserActivity}
    >
      <BrandDashboard
        key={searchParams.toString()} // force re-render on param change
        brand={brand}
        siteConfig={siteConfig}
        stripspeed={stripspeed}
        cardduration={cardduration}
        activeNowIntervalms={activeNowIntervalms}
        activeTodayIntervalms={activeTodayIntervalms}
        videoDurationTime={videoDisplayTime}
      />

      {/* Controls */}
      {showControls && (
        <div
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else {
                document.exitFullscreen().catch(() => {});
              }
            }}
            className="px-4 py-2 rounded bg-black/70 text-white hover:bg-black/90"
          >
            {fullscreenParam ? "Exit ⛶" : "Fullscreen ⛶"}
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 rounded bg-black/70 text-white hover:bg-black/90"
          >
            ⚙ Settings
          </button>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <EditorialBrandSettingsClient
          brand={brand}
          siteConfig={siteConfig}
          currentParams={currentParams} // ✅ pass current params
          onClose={() => setShowSettings(false)}
          onSave={handleSettingsSave}
        />
      )}
    </div>
  );
}
