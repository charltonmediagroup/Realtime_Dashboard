"use client";

import { useEffect, useRef } from "react";

export default function WakeLockProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      if (!("wakeLock" in navigator)) return;
      if (document.visibilityState !== "visible") return;
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        wakeLockRef.current.addEventListener("release", () => {
          console.log("Wake Lock released");
        });
        console.log("Wake Lock active");
      } catch (err) {
        // NotAllowedError is expected when the tab isn't focused or policy blocks it.
        if ((err as Error)?.name !== "NotAllowedError") {
          console.warn("Wake Lock error:", err);
        }
      }
    };

    requestWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      wakeLockRef.current?.release?.();
    };
  }, []);

  return <>{children}</>;
}
