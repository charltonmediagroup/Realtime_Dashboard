"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import BrandSettingsClient from "./BrandSettingsClient";
import DashboardControls from "@/src/components/DashboardControls";

const BrandDashboard = dynamic(
  () => import("@/src/components/BrandDashboard"),
  { ssr: false }
);

const BrandAwards = dynamic(
  () => import("@/src/components/BrandAwards"),
  { ssr: false }
);

interface BrandPageProps {
  brand: string;
}

const DEFAULTS = {
  rotation: 60000,
  stripspeed: 100,
  cardduration: 4000,
  activeNowIntervalms: 10000,
  activeTodayIntervalms: 60000,
  videoDisplayTime: 30,
};

export default function BrandPageClient({ brand }: BrandPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [siteConfig, setSiteConfig] = useState<any | null>(null);
  const [awardsConfig, setAwardsConfig] = useState<any | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const [componentIndex, setComponentIndex] = useState(0);

  const rotationTimer = useRef<NodeJS.Timeout | null>(null);

  const baseUrl =
    process.env.JSON_PROVIDER_URL || process.env.NEXT_PUBLIC_SITE_URL;

  /* ---------------- COMPONENT LIST ---------------- */

  const components = [
    <BrandDashboard
      key="dashboard"
      brand={brand}
      siteConfig={siteConfig}
      stripspeed={Number(
        searchParams.get("stripspeed") ?? DEFAULTS.stripspeed
      )}
      cardduration={Number(
        searchParams.get("cardduration") ?? DEFAULTS.cardduration
      )}
      activeNowIntervalms={Number(
        searchParams.get("activeNowIntervalms") ??
        DEFAULTS.activeNowIntervalms
      )}
      activeTodayIntervalms={Number(
        searchParams.get("activeTodayIntervalms") ??
        DEFAULTS.activeTodayIntervalms
      )}
      videoDurationTime={Number(
        searchParams.get("videoDisplayTime") ??
        DEFAULTS.videoDisplayTime
      )}
    />,

    <BrandAwards
      key="awards"
      brand={brand}
      siteConfig={siteConfig}
      awardsConfig={awardsConfig}
    />,
  ];

  /* ---------------- FETCH CONFIG ---------------- */

  useEffect(() => {
    if (!baseUrl) return;

    fetch(
      `${baseUrl}/api/json-provider/dashboard-config/brand-all-properties/${brand}`,
      { cache: "no-store" }
    )
      .then((r) => r.json())
      .then(setSiteConfig)
      .catch(() => console.error("Failed to load brand config"));
  }, [brand, baseUrl]);

  /* ---------------- FETCH AWARDS CONFIG ---------------- */

  useEffect(() => {
    if (!baseUrl) return;

    fetch(
      `${baseUrl}/api/awards/${brand}`,
      { cache: "no-store" }
    )
      .then((r) => r.json())
      .then(setAwardsConfig)
      .catch(() => console.error("Failed to load brand config"));
  }, [brand, baseUrl]);

  /* ---------------- ROTATION ---------------- */

  const rotationInterval = Number(
    searchParams.get("rotation") ?? DEFAULTS.rotation
  );

  useEffect(() => {
    if (!siteConfig) return;
    if (showSettings) return;
    if (rotationInterval === 0) return;

    if (rotationTimer.current)
      clearInterval(rotationTimer.current);

    rotationTimer.current = setInterval(() => {
      setComponentIndex((prev) => (prev + 1) % components.length);
    }, rotationInterval);

    return () => {
      if (rotationTimer.current)
        clearInterval(rotationTimer.current);
    };
  }, [rotationInterval, siteConfig, showSettings]);

  /* ---------------- MANUAL NAV ---------------- */

  const nextComponent = () => {
    setComponentIndex((prev) => (prev + 1) % components.length);
  };

  const prevComponent = () => {
    setComponentIndex(
      (prev) => (prev - 1 + components.length) % components.length
    );
  };

  /* ---------------- SETTINGS SAVE ---------------- */

  const handleSettingsSave = (params: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();

    router.push(`/dashboard/${brand}?${query}`);
    setShowSettings(false);
  };

  if (!siteConfig)
    return (
      <div className="h-screen flex items-center justify-center">
        Loading…
      </div>
    );

  return (
    <div className="flex flex-col w-screen min-h-screen overflow-hidden">
      {/* ---------------- CURRENT COMPONENT ---------------- */}

      {components[componentIndex]}

      <DashboardControls>
        <button onClick={prevComponent} className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60">◀</button>
        <button onClick={nextComponent} className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60">▶</button>
        <button onClick={() => setShowSettings(true)} className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60">⚙ Settings</button>
      </DashboardControls>

      {/* ---------------- SETTINGS ---------------- */}

      {showSettings && (
        <div onClick={(e) => e.stopPropagation()}>
          <BrandSettingsClient
            brand={brand}
            siteConfig={siteConfig}
            currentParams={{
              rotation: String(rotationInterval),
            }}
            onClose={() => setShowSettings(false)}
            onSave={handleSettingsSave}
          />
        </div>
      )}
    </div>
  );
}
