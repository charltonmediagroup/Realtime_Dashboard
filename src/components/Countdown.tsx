"use client";

import { useEffect, useState } from "react";

interface CountdownProps {
  target?: string | null;
  done?: string;
}

export default function Countdown({ target, done }: CountdownProps) {
  const [time, setTime] = useState<string>(done || "");

  useEffect(() => {
    if (!target) return;

    const interval = setInterval(() => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setTime(done || "Ended");
        clearInterval(interval);
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor(diff / 3600000) % 24;
      const m = Math.floor(diff / 60000) % 60;
      const s = Math.floor(diff / 1000) % 60;
      setTime(`${d}d ${h}h ${m}m ${s}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [target, done]);

  return <span className="uppercase">{time}</span>;
}