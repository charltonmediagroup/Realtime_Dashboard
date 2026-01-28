"use client";

import { useEffect, useState } from "react";

interface OdometerProps {
  fetchUrl?: string;
  field?: string;
  fontSize?: string;
  bold?: boolean;
  color?: string;
  backgroundColor?: string;
}

const OdometerDaily = ({
  fetchUrl = "/api/active-30-days",
  field = "activeLast30Days",
  fontSize = "3rem",
  bold = false,
  color = "#010101",
  backgroundColor = "#ffffff00",
}: OdometerProps) => {
  const [value, setValue] = useState<number>(0);

  const fetchValue = async () => {
    if (!fetchUrl) return;
    try {
      const res = await fetch(fetchUrl);
      const data = await res.json();
      if (typeof data[field] === "number") {
        setValue(data[field]);
      }
    } catch (err) {
      console.error("Failed to fetch value:", err);
    }
  };

  useEffect(() => {
    // Reset value when fetchUrl or field changes (brand switched)
    setValue(0);

    // Fetch immediately
    fetchValue();

    // Schedule fetch at next 12:00 noon
    const now = new Date();
    const nextNoon = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      12, 0, 0, 0
    );
    if (now >= nextNoon) {
      nextNoon.setDate(nextNoon.getDate() + 1);
    }
    const timeToWait = nextNoon.getTime() - now.getTime();

    const timeoutId = setTimeout(() => {
      fetchValue();

      // Schedule daily interval every 24h
      const intervalId = setInterval(fetchValue, 24 * 60 * 60 * 1000);
      // Clear interval on unmount or fetchUrl change
      return () => clearInterval(intervalId);
    }, timeToWait);

    // Cleanup on unmount or fetchUrl/field change
    return () => clearTimeout(timeoutId);
  }, [fetchUrl, field]);

  return (
    <div
      style={{
        display: "flex",
        fontSize,
        fontWeight: bold ? "bold" : "normal",
        color,
        backgroundColor,
        lineHeight: 1,
      }}
    >
      {value.toLocaleString()}
    </div>
  );
};

export default OdometerDaily;
