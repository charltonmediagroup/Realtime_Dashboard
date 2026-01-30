"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface OdometerProps {
  fetchUrl?: string;
  bold?: boolean;
  color?: string;
  backgroundColor?: string;
  intervalms?: number;
}

const Odometer = ({
  fetchUrl = "/api/active-now",
  bold = false,
  color = "#010101",
  backgroundColor = "#ffffff00",
  intervalms = 60000,
}: OdometerProps) => {
  const [targetValue, setTargetValue] = useState(0);
  const [displayValue, setDisplayValue] = useState(0);
  const [initialFetched, setInitialFetched] = useState(false);

  useEffect(() => {
    const fetchValue = async () => {
      const res = await fetch(`${fetchUrl}?intervalms=${intervalms}`);
      const data = await res.json();

      if (typeof data.activeUsers === "number") {
        setTargetValue(data.activeUsers);
        if (!initialFetched) {
          setDisplayValue(data.activeUsers);
          setInitialFetched(true);
        }
      }
    };

    fetchValue();
    const timer = setInterval(fetchValue, intervalms);
    return () => clearInterval(timer);
  }, [fetchUrl, intervalms, initialFetched]);

  useEffect(() => {
    if (!initialFetched || displayValue === targetValue) return;

    const step = displayValue < targetValue ? 1 : -1;
    const timer = setInterval(() => {
      setDisplayValue((v) => (v === targetValue ? v : v + step));
    }, 30);

    return () => clearInterval(timer);
  }, [displayValue, targetValue, initialFetched]);

  const padded = displayValue
    .toString()
    .padStart(targetValue.toString().length, "0");

  return (
    <div
      style={{
        display: "flex",
        fontWeight: bold ? "bold" : "normal",
        color,
        backgroundColor,
        lineHeight: 1,
      }}
    >
      {padded.split("").map((digit, i) => (
        <span
          key={i}
          style={{
            position: "relative",
            width: "1ch",
            overflow: "hidden",
            display: "inline-block",
          }}
        >
          <AnimatePresence initial={false}>
            <motion.span
              key={digit + i}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {digit}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </div>
  );
};

export default Odometer;
