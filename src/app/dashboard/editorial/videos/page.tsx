"use client";

import { useEffect, useState } from "react";
import VideoRotator from "@/src/components/VideoRotator";
import EditorialVideosTicker from "@/src/components/EditorialVideosTicker";
import VideoPageControls from "@/src/components/VideoPageControls";

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
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <div className="bg-video absolute inset-0">
          <VideoRotator xmlUrl={feedUrls} />
        </div>
        <div className="fg-video absolute inset-0">
          <VideoRotator xmlUrl={feedUrls} />
        </div>
      </div>
      <EditorialVideosTicker />
      <VideoPageControls />
      <style>{`
        .bg-video .video-title,
        .fg-video .video-title { display: none !important; }

        .bg-video .video-wrapper { height: 100%; }
        .bg-video .video-area {
          aspect-ratio: auto !important;
          width: 100% !important;
          height: 100% !important;
        }
        .bg-video iframe {
          transform: scale(1.4);
          filter: blur(40px) saturate(1.3);
          transform-origin: center;
        }

        .fg-video .video-wrapper { height: 100%; }
        .fg-video .video-area {
          aspect-ratio: auto !important;
          width: 100% !important;
          height: 100% !important;
          background: transparent !important;
        }
      `}</style>
    </div>
  );
}
