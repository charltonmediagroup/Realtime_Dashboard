// src/components/BrandDashboard.tsx
"use client";

import Image from "next/image";
import TickerStrip from "./TickerStrip";
import TickerCard from "./TickerCard";
import VideoRotator from "./VideoRotator";
import AwardCountdown from "./AwardCountdown";
import { useState, useEffect } from "react";

interface BrandDashboardProps {
  brand: string;
  siteConfig: any;
  awardsConfig: any;
  stripspeed?: number;
  cardduration?: number;
  activeNowIntervalms?: number;
  activeTodayIntervalms?: number;
  videoDurationTime?: number;

}

export default function AwardsDashboard({
  brand,
  siteConfig,
  awardsConfig,
  stripspeed = 100,
  cardduration = 4000,
  videoDurationTime = 30
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

  const [showVideoRotator, setShowVideoRotator] = useState(true);

  const awards = Array.isArray(awardsConfig) ? awardsConfig : [awardsConfig];
  console.log(awards)


  useEffect(() => {
    if (!videosFeedUrl) setShowVideoRotator(false);
  }, [videosFeedUrl]);

  const toggleFullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="bg-white flex flex-col min-h-screen md:h-screen">
      {/* ================= HEADER ================= */}
      <header className="flex items-center justify-between px-3 py-4 shrink-0 overflow-x-auto md:overflow-x-visible">
        {/* Left block */}
        <div className="flex items-center gap-4">
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

          {/* Mobile CMG toggle */}
          <div
            onClick={toggleFullscreen}
            className="relative h-12 w-20 cursor-pointer md:hidden"
            title="Toggle fullscreen"
          >
            <Image
              src="/logo/cmg.png"
              alt="Media Group"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Right block – desktop CMG toggle */}
        <div className="hidden md:flex">
          <div
            onClick={toggleFullscreen}
            className="relative h-24 w-32 cursor-pointer"
            title="Toggle fullscreen"
          >
            <Image
              src="/logo/cmg.png"
              alt="Media Group"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 md:min-h-0 md:overflow-hidden flex flex-col md:flex-row items-stretch justify-center px-3 md:px-8 py-4 gap-8 pb-[100px]">
        <div className="w-full max-w-[1920px] flex flex-col md:flex-row justify-between gap-8 px-3 md:px-8 ">
          <AwardCountdown awards={awards} />
          {showVideoRotator && (
            <div className="w-full md:w-[clamp(40%,100vh,80%)] flex flex-col h-full overflow-hidden">
              <VideoRotator
                xmlUrl={videosFeedUrl}
                displayTime={videoDurationTime}
                onError={() => setShowVideoRotator(false)}
              />
            </div>
          )}
        </div>
      </main>

      {/* ================= TICKERS ================= */}
      <footer className="fixed bottom-0 left-0 z-50 w-full md:static">
        <div className="flex flex-col md:space-y-0 gap-0">
          <div className="flex-1 min-w-0">
            <TickerCard
              feedUrl={exclusiveFeedUrl}
              duration={cardduration}
              fontSize="clamp(20px, 2vw, 38px)"
              height="clamp(65px, 6vh, 80px)"
            />
          </div>
          <div className="flex-1 min-w-0">
            <TickerStrip
              feedUrl={feedUrl}
              speed={stripspeed}
              fontSize="clamp(20px, 2vw, 38px)"
              height="clamp(65px, 6vh, 80px)"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
