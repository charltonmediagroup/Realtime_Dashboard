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

function resolveExclusiveFeed(cfg: SiteConfig) {
  if (cfg?.exclusiveFeed) return cfg.exclusiveFeed;
  const base = stripTrailingSlash(cfg?.url);
  return base ? `${base}/exclusive-news-feed.xml` : "";
}

export default function EditorialVideosTicker() {
  const [configs, setConfigs] = useState<BrandConfigs>({});

  useEffect(() => {
    const load = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
        const res = await fetch(
          `${baseUrl}/api/json-provider/dashboard-config/brand-all-properties?filter[editorial]=true`,
          { cache: "force-cache" },
        );
        setConfigs((await res.json()) as BrandConfigs);
      } catch (err) {
        console.error("Failed to load editorial brand configs:", err);
      }
    };
    load();
  }, []);

  const { exclusiveFeeds, newsFeeds } = useMemo(() => {
    const entries = Object.values(configs);
    return {
      exclusiveFeeds: entries.map(resolveExclusiveFeed).filter(Boolean),
      newsFeeds: entries.map(resolveNewsFeed).filter(Boolean),
    };
  }, [configs]);

  if (!exclusiveFeeds.length && !newsFeeds.length) return null;

  return (
    <footer className="fixed bottom-0 left-0 z-50 w-full md:static">
      <div className="flex flex-col md:space-y-0 gap-0">
        {exclusiveFeeds.length > 0 && (
          <div className="flex-1 min-w-0">
            <TickerCard feedUrl={exclusiveFeeds} duration={4000} />
          </div>
        )}
        {newsFeeds.length > 0 && (
          <div className="flex-1 min-w-0">
            <TickerStrip feedUrl={newsFeeds} speed={100} />
          </div>
        )}
      </div>
    </footer>
  );
}
