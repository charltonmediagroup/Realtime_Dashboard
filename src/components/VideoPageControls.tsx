"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const WAIT_MODE_KEY = "shortsWaitMode";
const WAIT_MODE_EVENT = "shortsModeChange";

export default function VideoPageControls() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [waitMode, setWaitMode] = useState(false);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    setIsFullscreen(!!document.fullscreenElement);
    setWaitMode(localStorage.getItem(WAIT_MODE_KEY) === "true");
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    const onActivity = (e: MouseEvent | TouchEvent) => {
      const y =
        e instanceof TouchEvent
          ? e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY ?? 0
          : (e as MouseEvent).clientY;
      if (y < window.innerHeight * 0.75) return;

      setVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setVisible(false), 5000);
    };
    window.addEventListener("click", onActivity);
    window.addEventListener("touchstart", onActivity, { passive: true });
    return () => {
      window.removeEventListener("click", onActivity);
      window.removeEventListener("touchstart", onActivity);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const toggleWaitMode = () => {
    const next = !waitMode;
    setWaitMode(next);
    localStorage.setItem(WAIT_MODE_KEY, String(next));
    window.dispatchEvent(new Event(WAIT_MODE_EVENT));
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3"
      onClick={(e) => e.stopPropagation()}
    >
      <label className="flex items-center gap-2 px-4 py-2 rounded bg-black/70 text-white cursor-pointer select-none">
        <input
          type="checkbox"
          checked={waitMode}
          onChange={toggleWaitMode}
          className="accent-blue-500"
        />
        Finish shorts before changing
      </label>
      <button
        onClick={toggleFullscreen}
        className="px-4 py-2 rounded bg-black/70 text-white hover:bg-black/90"
      >
        {isFullscreen ? "Exit ⛶" : "Fullscreen ⛶"}
      </button>
      <button
        onClick={() => router.push("/")}
        className="px-4 py-2 rounded bg-black/70 text-white hover:bg-black/90"
      >
        🏠 Home
      </button>
    </div>
  );
}
