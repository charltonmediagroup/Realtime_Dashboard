// src/components/BrandDashboard.tsx
"use client";

import Image from "next/image";
import TickerStrip from "./TickerStrip";
import TickerCard from "./TickerCard";
import OdometerLast from "./OdometerLast";
import VideoRotator from "./VideoRotator";
import TopViews from "./TopViews";
import { useState, useEffect } from "react";

interface BrandDashboardProps {
  brand: string;
  siteConfig: any;
  stripspeed?: number;
  cardduration?: number;
  activeNowIntervalms?: number;
  activeTodayIntervalms?: number;
}

export default function BrandDashboard({
  brand,
  siteConfig,
  stripspeed = 100,
  cardduration = 4000,
  activeNowIntervalms = 10000,
  activeTodayIntervalms = 60000,
}: BrandDashboardProps) {
  const safeReplace = (url: string) => (url ? url.replace(/\/$/, "") : "");

  const feedUrl =
    siteConfig?.exclusivesUrl ??
    safeReplace(siteConfig?.url) + "/news-feed.xml";
  const exclusiveFeedUrl =
    siteConfig?.exclusiveFeed ??
    safeReplace(siteConfig?.url) + "/exclusive-news-feed.xml";
  const videosFeedUrl =
    siteConfig?.videosFeed ??
    safeReplace(siteConfig?.url) + "/latest-videos.xml";
  const articlesFeedUrl =
    siteConfig?.ArticlesFeed ??
    safeReplace(siteConfig?.url) + "/top-read-feed.xml";

  const [showTopViews, setShowTopViews] = useState(true);
  const [showVideoRotator, setShowVideoRotator] = useState(true);

  useEffect(() => {
    if (!articlesFeedUrl) setShowTopViews(false);
    if (!videosFeedUrl) setShowVideoRotator(false);
  }, [articlesFeedUrl, videosFeedUrl]);

  const toggleFullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="bg-white h-screen flex flex-col">
      {/* ================= HEADER ================= */}
      <header className="px-3 py-2 flex flex-col md:flex-row flex-wrap md:flex-nowrap items-center gap-4 md:gap-6 h-auto md:h-[120px] shrink-0">
        {/* Left logo */}
        {siteConfig?.image && (
          <div className="relative h-14 w-40 md:h-24 md:w-64">
            <Image
              src={`/${siteConfig.image}`}
              alt={siteConfig.name}
              fill
              className="object-contain"
              priority
            />
          </div>
        )}

        <button
          onClick={toggleFullscreen}
          className="relative h-12 w-20 md:h-24 md:w-32 cursor-pointer block md:hidden"
          title="Toggle fullscreen"
        >
          <Image
            src="/logo/cmg.png"
            alt="Charlton Media Group"
            fill
            className="object-contain"
            priority
          />
        </button>

        {/* Metrics */}
        <div className="flex flex-wrap justify-center md:justify-evenly gap-6 md:gap-16 flex-1 text-gray-900">
          {[
            {
              label: "Active Users Last 365 Days",
              url: `/api/active-365-days/${brand}`,
              field: "activeLast365Days",
            },
            {
              label: "Active Users Last 30 Days",
              url: `/api/active-30-days/${brand}`,
              field: "activeLast30Days",
            },
            {
              label: "Active Users Today",
              url: `/api/active-today/${brand}`,
              field: "activeToday",
              intervalms: activeTodayIntervalms,
            },
            {
              label: "Active Users Now",
              url: `/api/active-now/${brand}`,
              field: "activeUsers",
              intervalms: activeNowIntervalms,
            },
          ].map((m) => (
            <div key={m.label} className="flex flex-col items-center text-center">
              <p className="text-xs md:text-sm">{m.label}</p>
              <OdometerLast
                fetchUrl={m.url}
                field={m.field}
                fontSize="clamp(1.5rem, 4vw, 3rem)"
                intervalms={m.intervalms}
              />
            </div>
          ))}
        </div>

        {/* CMG fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          className="relative h-12 w-20 md:h-24 md:w-32 cursor-pointer hidden md:block"
          title="Toggle fullscreen"
        >
          <Image
            src="/logo/cmg.png"
            alt="Charlton Media Group"
            fill
            className="object-contain"
            priority
          />
        </button>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 flex items-center justify-center overflow-hidden py-16">
        <div className="w-full max-w-[1920px] flex flex-col md:flex-row gap-8 md:gap-8 px-3 md:px-8 h-fit">
          {showTopViews && (
            <div className="w-full md:w-[40%] flex flex-col overflow-hidden">
              <TopViews
                xmlUrl={articlesFeedUrl}
                limit={10}
                onError={() => setShowTopViews(false)}
              />
            </div>
          )}

          {showVideoRotator && (
            <div className="w-full md:w-[60%] flex flex-col h-full overflow-hidden">
              <VideoRotator
                xmlUrl={videosFeedUrl}
                displayTime={30}
                onError={() => setShowVideoRotator(false)}
              />
            </div>
          )}
        </div>
      </main>

      {/* ================= TICKERS ================= */}
      <footer className="shrink-0">
        <TickerCard
          feedUrl={exclusiveFeedUrl}
          duration={cardduration}
          labelColor="#ff0000"
        />

        <TickerStrip
          feedUrl={feedUrl}
          speed={stripspeed}
        />
      </footer>
    </div>
  );
}
