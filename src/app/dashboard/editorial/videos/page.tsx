"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import EditorialVideosRotator from "@/src/components/EditorialVideosRotator";
import EditorialVideosTicker from "@/src/components/EditorialVideosTicker";
import DashboardControls from "@/src/components/DashboardControls";

interface SiteConfig {
  url?: string;
  videosFeed?: string;
  name?: string;
}

interface BrandEntry {
  brand: string;
  siteConfig: SiteConfig;
}

function getVideoFeed(siteConfig: SiteConfig) {
  if (siteConfig?.videosFeed) return siteConfig.videosFeed;
  const url = (siteConfig?.url ?? "").replace(/\/$/, "");
  return url ? `${url}/latest-videos.xml` : "";
}

export default function EditorialVideosPage() {
  const [brands, setBrands] = useState<BrandEntry[]>([]);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
        const res = await fetch(
          `${baseUrl}/api/json-provider/dashboard-config/brand-all-properties?filter[editorial]=true`,
          { cache: "force-cache" }
        );
        const config = await res.json();
        setBrands(
          Object.entries(config).map(([brand, siteConfig]) => ({
            brand,
            siteConfig: siteConfig as SiteConfig,
          }))
        );
      } catch (err) {
        console.error("Failed to load brands:", err);
      }
    };
    fetchBrands();
  }, []);

  if (!brands.length) {
    return (
      <div className="h-screen flex items-center justify-center bg-white text-black">
        Loading…
      </div>
    );
  }

  const feedUrls = brands
    .map((b) => getVideoFeed(b.siteConfig))
    .filter(Boolean);

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 relative overflow-hidden bg-white">
        <div className="fg-video absolute inset-0">
          <EditorialVideosRotator xmlUrl={feedUrls} />
        </div>
      </div>
      <EditorialVideosTicker />
      <DashboardControls>
        <Link href="/dashboard/editorial" className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60">← Back</Link>
      </DashboardControls>
      <style>{`
        .fg-video .video-title { display: none !important; }
        .fg-video .video-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .fg-video .video-area {
          position: absolute !important;
          inset: 0 !important;
          aspect-ratio: auto !important;
          width: 100% !important;
          height: 100% !important;
          overflow: hidden !important;
          background: white !important;
        }
        .fg-video .video-layer {
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          width: 100vw !important;
          height: 56.25vw !important;
          min-height: 100vh !important;
          min-width: 177.78vh !important;
          transform: translate(-50%, -50%) !important;
          border: 0 !important;
        }
      `}</style>
    </div>
  );
}
