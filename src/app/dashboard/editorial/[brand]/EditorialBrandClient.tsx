"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import EditorialBrandSettingsClient from "./BrandSettingsClient";
import DashboardControls from "@/src/components/DashboardControls";

const BrandDashboard = dynamic(
  () => import("@/src/components/BrandDashboard"),
  { ssr: false }
);

interface BrandPageProps {
  brand: string;
}

export default function EditorialBrandClient({ brand }: BrandPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [siteConfig, setSiteConfig] = useState<any | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const baseUrl =
    process.env.JSON_PROVIDER_URL || process.env.NEXT_PUBLIC_SITE_URL;

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

  if (!siteConfig) {
    return <div className="h-screen flex items-center justify-center">Loading…</div>;
  }

  return (
    <div className="flex flex-col w-screen min-h-screen overflow-hidden">
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

      <DashboardControls>
        <button
          onClick={() => setShowSettings(true)}
          className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60"
        >
          ⚙ Settings
        </button>
      </DashboardControls>

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
