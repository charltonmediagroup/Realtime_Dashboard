"use client";

import { useEffect, useState } from "react";
import VideoRotator from "@/src/components/VideoRotator";

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

  const mainBrand = brands[0];
  const sideBrands = brands.slice(1, 5);

  return (
    <div className="min-h-screen bg-white p-4 flex justify-center items-center">
      <div className="flex gap-2 items-start w-[85%]">
        <div className="flex-[4] min-w-0">
          <VideoRotator xmlUrl={getVideoFeed(mainBrand.siteConfig)} />
        </div>
        <div
          className="flex-[1] min-w-0 flex flex-col gap-1 side-videos"
          style={{ aspectRatio: "4 / 9" }}
        >
          {sideBrands.map((b) => (
            <div key={b.brand} className="w-full flex-1 min-h-0">
              <VideoRotator xmlUrl={getVideoFeed(b.siteConfig)} />
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .side-videos .video-title { display: none !important; }
        .side-videos .video-area { aspect-ratio: auto !important; height: 100% !important; }
      `}</style>
    </div>
  );
}
