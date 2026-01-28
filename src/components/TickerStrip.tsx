"use client";

import { color } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface TickerStripProps {
  feedUrl: string;
  label?: string;
  speed?: number;
  backgroundColor?: string;
  labelColor?: string;
  limit?: number;
  refreshIntervalMs?: number;
}

export default function TickerStrip({
  feedUrl,
  label = "Latest News",
  speed = 100,
  backgroundColor = "#FF0000",
  labelColor = "#074782",
  limit = 10,
  refreshIntervalMs = 10 * 60 * 1000,
}: TickerStripProps) {
  const [headlines, setHeadlines] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const headlinesRef = useRef<HTMLSpanElement>(null);

  // Fetch RSS/XML
  useEffect(() => {
    if (!feedUrl) return;

    let timer: NodeJS.Timeout;

    const loadHeadlines = async () => {
      try {
        const res = await fetch(feedUrl + "?cache=" + Date.now());
        const xmlText = await res.text();
        const xml = new DOMParser().parseFromString(xmlText, "application/xml");

        let titles: string[] = [];
        const items = xml.querySelectorAll("item");
        if (items.length) {
          titles = Array.from(items)
            .slice(0, limit)
            .map((i) => i.querySelector("title")?.textContent?.trim() || "Untitled");
        } else {
          // fallback to Atom feed
          const entries = xml.querySelectorAll("entry");
          titles = Array.from(entries)
            .slice(0, limit)
            .map((e) => e.querySelector("title")?.textContent?.trim() || "Untitled");
        }

        setHeadlines(titles);
      } catch (err) {
        console.error("Failed to load RSS feed:", err);
      }
    };

    loadHeadlines();
    timer = setInterval(loadHeadlines, refreshIntervalMs);

    return () => clearInterval(timer);
  }, [feedUrl, limit, refreshIntervalMs]);

  // Horizontal scroll animation
  useEffect(() => {
    const headlinesEl = headlinesRef.current;
    const containerEl = containerRef.current;
    if (!headlinesEl || !containerEl || headlines.length === 0) return;

    const contentWidth = headlinesEl.offsetWidth;
    const containerWidth = containerEl.offsetWidth;

    if (contentWidth <= containerWidth) {
      headlinesEl.style.animation = "";
      headlinesEl.style.transform = "translateX(0)";
      return;
    }

    const duration = (contentWidth + containerWidth) / speed;

    const animName = "scrollAnim_" + Date.now();

    // Remove previous dynamic style if exists
    document.getElementById("dynamic-scroll-style")?.remove();

    const styleTag = document.createElement("style");
    styleTag.id = "dynamic-scroll-style";
    styleTag.innerHTML = `
      @keyframes ${animName} {
        0% { transform: translateX(${containerWidth}px); }
        100% { transform: translateX(${-contentWidth}px); }
      }
    `;
    document.head.appendChild(styleTag);

    headlinesEl.style.animation = `${animName} ${duration}s linear infinite`;
    headlinesEl.style.willChange = "transform";
  }, [headlines, speed]);

  return (
    <div style={{ ...styles.ticker }}>
      <style>
        {`
          @font-face {
            font-family: 'DIN';
            src: url('/fonts/D-DIN.otf') format('opentype');
            font-weight: 400;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'DIN-Bold';
            src: url('/fonts/D-DIN-Bold.otf') format('opentype');
            font-weight: 700;
            font-style: normal;
            font-display: swap;
          }
        `}
      </style>
      <div style={{ ...styles.label, backgroundColor: labelColor }}>{label}</div>
      <div ref={containerRef} style={styles.scroll}>
        <span ref={headlinesRef} style={styles.headlines}>
          {headlines.map((h, i) => (
            <span key={i} style={styles.item}>
              {h.toUpperCase()}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

const styles = {
  ticker: {
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
    whiteSpace: "nowrap" as const,
    width: "100%",
    fontSize: "clamp(1.25rem, 1.5vw, 1.75rem)",
    height: "50px",
    fontFamily: '"DIN-Bold", Arial, sans-serif',
    backgroundColor: "#FF0000",
  },
  label: {
    width: "175px",
    fontWeight: "bold" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textTransform: "uppercase" as const,
    height: "100%",
    flexShrink: 0,
    textShadow: "0 0 5px rgba(0,0,0,0.5)",
    color: "white",
  },
  scroll: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
  },
  headlines: {
    whiteSpace: "nowrap" as const,
    display: "inline-block",
    fontWeight: "bold" as const,
    backgroundColor: "#FF0000",
  },
  item: {
    margin: "0 200px",
    display: "inline-block",
    color: "white",
  },
};
