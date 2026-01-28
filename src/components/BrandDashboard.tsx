// src/components/BrandDashboard.tsx
"use client";

import Image from "next/image";
import TickerStrip from "./TickerStrip";
import TickerCard from "./TickerCard";
import OdometerDaily from "./OdometerDaily";
import OdometerLast from "./OdometerLast";
import VideoRotator from "./VideoRotator";
import TopViews from "./TopViews";
import { useState, useEffect } from "react";

interface BrandDashboardProps {
  brand: string;
  siteConfig: any;
  speed?: number;
  themeColor?: boolean;
}

export default function BrandDashboard({
  brand,
  siteConfig,
  speed = 100,
  themeColor = true,
}: BrandDashboardProps) {
  const safeReplace = (url: string) => (url ? url.replace(/\/$/, "") : "");

  const feedUrl = siteConfig?.exclusivesUrl ?? safeReplace(siteConfig?.url) + "/news-feed.xml";
  const exclusiveFeedUrl = siteConfig?.exclusiveFeed ?? safeReplace(siteConfig?.url) + "/exclusive-news-feed.xml";
  const videosFeedUrl = siteConfig?.videosFeed ?? safeReplace(siteConfig?.url) + "/latest-videos.xml";
  const articlesFeedUrl = siteConfig?.ArticlesFeed ?? safeReplace(siteConfig?.url) + "/top-read-feed.xml";

  // Track component visibility
  const [showTopViews, setShowTopViews] = useState(true);
  const [showVideoRotator, setShowVideoRotator] = useState(true);

  // Safety: hide if feeds fail
  useEffect(() => {
    if (!articlesFeedUrl) setShowTopViews(false);
    if (!videosFeedUrl) setShowVideoRotator(false);
  }, [articlesFeedUrl, videosFeedUrl]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(err => console.error("Failed to enter fullscreen:", err));
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="bg-white h-screen flex flex-col overflow-hidden">
      {/* ================= HEADER ================= */}
      <div className="p-2 pt-8 flex justify-between items-center gap-6 h-[120px] shrink-0">
        {siteConfig?.image && (
          <div className="relative h-24 w-64">
            <Image
              src={`/${siteConfig.image}`}
              alt={siteConfig.name}
              fill
              style={{ objectFit: "contain" }}
              priority
            />
          </div>
        )}

        <div className="flex justify-evenly gap-16 flex-1">
          <div className="flex flex-col items-center text-gray-900">
            <p>Active Users Last 365 Days</p>
            <OdometerDaily fetchUrl={`/api/active-365-days/${brand}`} field="activeLast365Days" />
          </div>

          <div className="flex flex-col items-center text-gray-900">
            <p>Active Users Last 30 Days</p>
            <OdometerDaily fetchUrl={`/api/active-30-days/${brand}`} field="activeLast30Days" />
          </div>

          <div className="flex flex-col items-center text-gray-900">
            <p>Active Users Today</p>
            <OdometerLast fetchUrl={`/api/active-today/${brand}`} field="activeToday" />
          </div>

          <div className="flex flex-col items-center text-gray-900">
            <p>Active Users Now</p>
            <OdometerLast fetchUrl={`/api/active-now/${brand}`} field="activeUsers" intervalms={10000} />
          </div>
        </div>

        {/* CMG Logo with fullscreen toggle */}
        <div
          className="relative h-24 w-32 cursor-pointer"
          onClick={toggleFullscreen}
          title="Click to toggle fullscreen"
        >
          <Image
            src="/logo/cmg.png"
            alt="Charlton Media Group"
            fill
            style={{ objectFit: "contain" }}
            priority
          />
        </div>
      </div>

      {/* ================= MAIN CONTENT ================= */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-[1920px] flex gap-8 px-8">
          {showTopViews && (
            <div className="w-[40%] flex items-center justify-center overflow-hidden">
              <TopViews
                xmlUrl={articlesFeedUrl}
                limit={10}
                onError={() => setShowTopViews(false)}
              />
            </div>
          )}

          {showVideoRotator && (
            <div className="w-[60%] flex items-center justify-center overflow-hidden">
              <VideoRotator
                xmlUrl={videosFeedUrl}
                displayTime={30}
                onError={() => setShowVideoRotator(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ================= TICKERS ================= */}
      <div className="shrink-0">
        <TickerCard
          feedUrl={exclusiveFeedUrl}
          duration={4000}
          labelColor="#ff0000"
          backgroundColor={themeColor ? siteConfig?.color : "#f5f5f5"}
        />

        <TickerStrip
          feedUrl={feedUrl}
          speed={speed}
          backgroundColor={themeColor ? siteConfig?.color : undefined}
        />
      </div>
    </div>
  );
}
