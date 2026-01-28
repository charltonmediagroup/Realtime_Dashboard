"use client";

import { useEffect, useState } from "react";

interface ArticleTableProps {
    xmlUrl: string;       // XML feed URL
    limit?: number;       // number of rows
    fontSize?: number;    // px
    title?: string;       // table header
    onError?: () => void;
}

export default function TopViews({
    xmlUrl,
    limit = 10,
    fontSize = 22,
    title = "Top 10 News Last 7 Days",
}: ArticleTableProps) {
    const [titles, setTitles] = useState<string[]>([]);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!xmlUrl) return;

        fetch(xmlUrl + "?_ts=" + Date.now())
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch XML");
                return res.text();
            })
            .then(xmlText => {
                const xml = new DOMParser().parseFromString(
                    xmlText,
                    "application/xml"
                );

                const items = Array.from(xml.querySelectorAll("item"))
                    .slice(0, limit)
                    .map(
                        item =>
                            item.querySelector("title")?.textContent?.trim() ||
                            "Untitled"
                    );

                setTitles(items);
            })
            .catch(err => {
                console.error(err);
                setError(true);
            });
    }, [xmlUrl, limit]);

    if (error) {
        return <div>Failed to load feed</div>;
    }

    return (
        <div style={styles.wrapper}>
            <div style={styles.container}>
                <table
                    style={{
                        ...styles.table,
                        fontSize: `${fontSize}px`,
                    }}
                >
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
        boxSizing: "border-box",
        background: "white",
    },
    container: {
        width: "100%",
        maxWidth: "1920px",
        margin: "0 auto",
    },
    table: {
        width: "100%",
        tableLayout: "fixed",
        borderCollapse: "collapse",
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
        padding: "10px 12px",
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
