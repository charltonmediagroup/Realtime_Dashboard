"use client";

import { useEffect, useRef, useState } from "react";

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
    labelColor = "#ff0000",
    limit = 10,
    refreshIntervalMs = 10 * 60 * 1000,
}: TickerCardProps) {
    const [headlines, setHeadlines] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const headlineRef = useRef<HTMLDivElement>(null);
    const [scrolling, setScrolling] = useState(false);

    // Fetch feed
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

    // Handle horizontal scroll for long headlines
    useEffect(() => {
        const scrollContainer = scrollRef.current;
        const headlineEl = headlineRef.current;
        if (!scrollContainer || !headlineEl) return;

        const containerWidth = scrollContainer.offsetWidth;
        const headlineWidth = headlineEl.scrollWidth;

        if (headlineWidth > containerWidth) {
            setScrolling(true);
            const SCROLL_PADDING = 24;
            const distance = headlineWidth - containerWidth + SCROLL_PADDING;
            const speed = 50; // pixels per second
            const scrollDuration = (distance / speed) * 1000;

            const startTimeout = setTimeout(() => {
                // Start horizontal scroll
                headlineEl.style.transition = `transform ${scrollDuration}ms linear`;
                headlineEl.style.transform = `translateX(-${distance}px)`;

                // After scrolling, reset and move to next headline
                const resetTimeout = setTimeout(() => {
                    headlineEl.style.transition = "";
                    headlineEl.style.transform = "translateX(0)";
                    setScrolling(false);
                    setCurrentIndex((prev) => (prev + 1) % headlines.length);
                }, scrollDuration + 500);

                return () => clearTimeout(resetTimeout);
            }, duration);

            return () => clearTimeout(startTimeout);
        } else {
            // Short headline: just wait duration before moving to next
            const timeout = setTimeout(() => {
                setCurrentIndex((prev) => (prev + 1) % headlines.length);
            }, duration);
            return () => clearTimeout(timeout);
        }
    }, [currentIndex, headlines, duration]);

    return (
        <div style={styles.ticker}>
            <div style={{ ...styles.label, backgroundColor: labelColor }}>{label}</div>
            <div style={styles.scroll} ref={scrollRef}>
                {headlines.map((h, i) => (
                    <div
                        key={i}
                        style={{
                            ...styles.headlineWrapper,
                            opacity: i === currentIndex ? 1 : 0,
                            transform:
                                i === currentIndex
                                    ? "translateY(-50%)"
                                    : "translateY(50%)",
                        }}
                    >
                        <div
                            ref={i === currentIndex ? headlineRef : null}
                            style={styles.headlineInner}
                        >
                            {h}
                        </div>
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
        fontSize: "clamp(1.25rem, 1.5vw, 1.75rem)",
        color: "black",
        height: "50px",
        fontFamily: '"DIN-Bold", Arial, sans-serif',
        overflow: "hidden",
        width: "100%",
        backgroundColor:"#F0F0F0"
    },
    label: {
        width: "clamp(90px, 8vw, 170px)",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textTransform: "uppercase" as const,
        color: "white",
        height: "100%",
        flexShrink: 0,
        fontSize: "clamp(12px, 1.2vw, 24px)",
    },
    scroll: {
        flex: 1,
        position: "relative" as const,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        minHeight: "50px",
    },
    headline: {
        position: "absolute" as const,
        top: "50%",
        left: 0,
        display: "flex",
        alignItems: "center",
        paddingLeft: "10px",
        fontWeight: 700,
        textTransform: "uppercase" as const,
        fontSize: "clamp(12px, 1.2vw, 24px)",
        lineHeight: 1.2,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        transform: "translateY(-50%)",
    },
    headlineWrapper: {
        position: "absolute" as const,
        top: "50%",
        left: 0,
        right: 0,
        height: "100%",
        display: "flex",
        alignItems: "center",
        paddingLeft: "10px",
        fontWeight: 700,
        textTransform: "uppercase" as const,
        fontSize: "clamp(12px, 1.2vw, 24px)",
        lineHeight: 1.2,
        whiteSpace: "nowrap",
        overflow: "hidden",
        backgroundColor: "#F2F2F2",
        transition: "transform 0.6s ease, opacity 0.6s ease",
    },
    headlineInner: {
        display: "inline-block",
        whiteSpace: "nowrap",
        willChange: "transform",
    },
};