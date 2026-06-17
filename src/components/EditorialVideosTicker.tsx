"use client";

import { useEffect, useMemo, useState } from "react";
import TickerCard from "./TickerCard";
import TickerStrip from "./TickerStrip";

interface SiteConfig {
  url?: string;
  exclusivesUrl?: string;
  exclusiveFeed?: string;
}

type BrandConfigs = Record<string, SiteConfig>;

const stripTrailingSlash = (u?: string) => (u ? u.replace(/\/$/, "") : "");

function resolveNewsFeed(cfg: SiteConfig) {
  if (cfg?.exclusivesUrl) return cfg.exclusivesUrl;
  const base = stripTrailingSlash(cfg?.url);
  return base ? `${base}/news-feed.xml` : "";
}

function resolveEventNewsFeed(cfg: SiteConfig) {
  const base = stripTrailingSlash(cfg?.url);
  return base ? `/api/event-news?url=${encodeURIComponent(base)}` : "";
}

function resolveExclusiveFeed(cfg: SiteConfig) {
  if (cfg?.exclusiveFeed) return cfg.exclusiveFeed;
  const base = stripTrailingSlash(cfg?.url);
  return base ? `${base}/exclusive-news-feed.xml` : "";
}

interface EditorialVideosTickerProps {
  newsSource?: "site" | "event-news";
}

export default function EditorialVideosTicker({
  newsSource = "site",
}: EditorialVideosTickerProps = {}) {
  const [configs, setConfigs] = useState<BrandConfigs>({});

  useEffect(() => {
    const baseUrl = "";
    const url = `${baseUrl}/api/json-provider/dashboard-config/brand-all-properties?filter[editorial]=true`;
    const delays = [0, 800, 2000, 4000];
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const attempt = async (i: number) => {
      if (cancelled) return;
      try {
        const res = await fetch(url, {
          cache: i === 0 ? "force-cache" : "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as BrandConfigs;
        if (!cancelled) setConfigs(data);
      } catch (err) {
        if (cancelled) return;
        if (i + 1 < delays.length) {
          timers.push(setTimeout(() => attempt(i + 1), delays[i + 1]));
        } else {
          console.error("Failed to load editorial brand configs:", err);
        }
      }
    };

    attempt(0);
    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  const { exclusiveFeeds, newsFeeds } = useMemo(() => {
    const entries = Object.values(configs);
    const resolver = newsSource === "event-news" ? resolveEventNewsFeed : resolveNewsFeed;
    return {
      exclusiveFeeds: entries.map(resolveExclusiveFeed).filter(Boolean),
      newsFeeds: entries.map(resolver).filter(Boolean),
    };
  }, [configs, newsSource]);

  if (!exclusiveFeeds.length && !newsFeeds.length) return null;

  return (
    <footer className="w-full">
      <div className="flex flex-col md:space-y-0 gap-0" style={{ boxShadow: "0 -6px 20px rgba(0,0,0,0.25)" }}>
        {exclusiveFeeds.length > 0 && (
          <div className="flex-1 min-w-0">
            <TickerCard
              feedUrl={exclusiveFeeds}
              duration={4000}
              fontSize="clamp(15px, 2.8vw, 52px)"
              height="clamp(40px, 7.5vh, 104px)"
            />
          </div>
        )}
        {newsFeeds.length > 0 && (
          <div className="flex-1 min-w-0">
            <TickerStrip
              feedUrl={newsFeeds}
              speed={60}
              fontSize="clamp(15px, 2.8vw, 52px)"
              height="clamp(40px, 7.5vh, 104px)"
            />
          </div>
        )}
      </div>
    </footer>
  );
}
