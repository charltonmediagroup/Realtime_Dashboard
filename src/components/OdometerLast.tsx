"use client";

import { useEffect, useState } from "react";

interface OdometerProps {
  fetchUrl?: string;
  field?: string;
  fontSize?: string;
  bold?: boolean;
  color?: string;
  backgroundColor?: string;
  intervalms?: number;
}

const OdometerLast = ({
  fetchUrl = "/api/active-today",
  field = "activeToday",
  fontSize = "3rem",
  bold = false,
  color = "#010101",
  backgroundColor = "#ffffff00",
  intervalms = 60000,
}: OdometerProps) => {
  const [value, setValue] = useState(0);

  // Fetch latest value
  useEffect(() => {
    const fetchValue = async () => {
      const res = await fetch(`${fetchUrl}?intervalms=${intervalms}`);
      const data = await res.json();
      if (typeof data[field] === "number") setValue(data[field]);
    };

    fetchValue();
    const timer = setInterval(fetchValue, intervalms);
    return () => clearInterval(timer);
  }, [fetchUrl, intervalms, field]);

  const formattedValue = value.toLocaleString();

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
      {formattedValue.split("").map((char, i) => (
        <span
          key={i}
          style={{
            width: char === "," ? "0.5ch" : "1ch",
            display: "inline-block",
          }}
        >
          {char}
        </span>
      ))}
    </div>
  );
};

export default OdometerLast;
