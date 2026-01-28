"use client";

import { color } from "framer-motion";
import { useEffect, useState } from "react";

interface TickerCardProps {
    feedUrl: string;
    label?: string;
    duration?: number;
    backgroundColor?: string;
    labelColor?: string;
    limit?: number;
    refreshIntervalMs?: number;
}

export default function TickerCard({
    feedUrl,
    label = "Exclusive",
    duration = 4000,
    backgroundColor = "#f5f5f5",
    labelColor = "#ff0000",
    limit = 10,
    refreshIntervalMs = 10 * 60 * 1000,
}: TickerCardProps) {
    const [headlines, setHeadlines] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Fetch feed and refresh
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

    // Rotate headlines
    useEffect(() => {
        if (headlines.length === 0) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % headlines.length);
        }, duration);

        return () => clearInterval(interval);
    }, [headlines, duration]);

    return (
        <div style={styles.ticker}>
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
            <div style={{ ...styles.scroll, backgroundColor:"#F2F2F2" }}>
                {headlines.map((h, i) => (
                    <div
                        key={i}
                        style={{
                            ...styles.headline,
                            opacity: i === currentIndex ? 1 : 0,
                            transform: i === currentIndex ? "translateY(0)" : "translateY(100%)",
                        }}
                    >
                        {h}
                    </div>
                ))}
            </div>
        </div>
    );
}

const styles = {
    ticker: {
        display: "flex",
        alignItems: "center",
        width: "100%",
        fontSize: "clamp(1.25rem, 1.5vw, 1.75rem)",
        color: "black",
        height: "50px",
        fontFamily: '"DIN-Bold", Arial, sans-serif',
        overflow: "hidden",
    },
    label: {
        width: "175px",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textTransform: "uppercase" as const,
        color: "white",
        height: "100%",
        flexShrink: 0,
    },
    scroll: {
        flex: 1,
        position: "relative" as const,
        overflow: "hidden",
        height: "100%", // make container fill ticker height
    },
    headline: {
        position: "absolute" as const,
        top: 0,
        left: 0,
        width: "100%",
        height: "100%", // fill container
        display: "flex",
        alignItems: "center", // vertically center text
        paddingLeft: "10px",
        fontWeight: 700,
        textTransform: "uppercase" as const,
        fontSize: "24px",
        lineHeight: 1.2,
        transition: "transform 0.6s ease, opacity 0.6s ease",    },
};
