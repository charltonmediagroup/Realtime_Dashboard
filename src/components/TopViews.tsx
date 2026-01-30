"use client";

import { useEffect, useState } from "react";

interface ArticleTableProps {
  xmlUrl: string;       // XML feed URL
  brand?: string;       // brand identifier
  limit?: number;       // number of rows
  title?: string;       // table header
  onError?: () => void;
}

// Simple in-memory cache by brand
const brandCache: Record<string, string[]> = {};

export default function TopViews({
  xmlUrl,
  brand = "default",
  limit = 10,
  title = "Top 10 News Last 7 Days",
  onError,
}: ArticleTableProps) {
  const [titles, setTitles] = useState<string[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!xmlUrl) return;

    const fetchFeed = async () => {
      try {
        const res = await fetch(xmlUrl + "?_ts=" + Date.now());
        if (!res.ok) throw new Error("Failed to fetch XML");
        const xmlText = await res.text();

        const xml = new DOMParser().parseFromString(xmlText, "application/xml");
        const items = Array.from(xml.querySelectorAll("item"))
          .slice(0, limit)
          .map(item => item.querySelector("title")?.textContent?.trim() || "Untitled");

        setTitles(items);
        setError(false);

        // Save to cache for this brand
        brandCache[brand] = items;
      } catch (err) {
        console.error(err);
        setError(true);

        // If we have cached titles for this brand, use them
        if (brandCache[brand]) {
          setTitles(brandCache[brand]);
          setError(false);
        }

        if (onError) onError();
      }
    };

    fetchFeed();
  }, [xmlUrl, brand, limit, onError]);

  if (error && !titles.length) {
    return <div>Failed to load feed</div>;
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>{title}</th>
            </tr>
          </thead>
          <tbody>
            {titles.map((t, i) => (
              <tr key={i}>
                <td style={styles.td}>
                  <span style={styles.ellipsis}>{t}</span>
                </td>
              </tr>
            ))}
            {!titles.length && (
              <tr>
                <td style={styles.td}>No articles found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- STYLES ---------- */

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    width: "100%",
    height: "100%",      
    overflow: "hidden",
    display: "flex",     
    flexDirection: "column",
    boxSizing: "border-box",
    background: "white",
  },
  container: {
    width: "100%",
    flex: 1,             
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    maxWidth: "1920px",
    margin: "0 auto",
  },
  table: {
    width: "100%",
    tableLayout: "fixed",
    borderCollapse: "collapse",
    height: "100%",      
    fontSize: "clamp(16px, 3vh, 22px)", // responsive font
  },
  th: {
    textAlign: "left",
    padding: "12px",
    fontWeight: "bold",
    background: "#f0f0f0",
    borderBottom: "2px solid #ddd",
    color: "#333",
  },
  td: {
    padding: "2px 12px",
    borderBottom: "1px solid #ddd",
    color: "#333",
  },
  ellipsis: {
    display: "block",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
};
