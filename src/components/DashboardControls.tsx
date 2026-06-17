"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface DashboardControlsProps {
  children?: ReactNode;
  className?: string;
}

export default function DashboardControls({
  children,
  className = "",
}: DashboardControlsProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    setIsFullscreen(!!document.fullscreenElement);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Toggle the overlay when tapping/clicking the bottom quarter of the screen.
  // A single pointer handler covers mouse + touch + pen. Using `pointerdown`
  // (instead of separate click + touchstart listeners) avoids the double-fire
  // on phones, where a tap fired touchstart AND a synthetic click — toggling
  // the overlay on then immediately off, so it never appeared.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (e.target instanceof Node && containerRef.current?.contains(e.target))
        return;
      if (e.clientY < window.innerHeight * 0.75) return;
      setVisible((v) => !v);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const resetTimer = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setVisible(false), 5000);
    };
    resetTimer();
    window.addEventListener("pointermove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      window.removeEventListener("pointermove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
    };
  }, [visible]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <>
      {/* Subtle always-on handle so touch users can discover the controls
          (the invisible bottom-quarter tap target alone is not discoverable). */}
      {!visible && (
        <button
          type="button"
          aria-label="Show controls"
          onClick={() => setVisible(true)}
          className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 h-1.5 w-16 rounded-full bg-white/30 ring-1 ring-white/10 backdrop-blur-sm touch-manipulation"
        />
      )}

      {visible && (
        <div
          ref={containerRef}
          className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex max-w-[92vw] flex-wrap items-center justify-center gap-3 rounded-2xl bg-gray-500/30 px-3 py-2 text-base shadow-lg ring-1 ring-white/15 backdrop-blur-md touch-manipulation select-none ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
          {children && (
            <span className="hidden h-8 w-px bg-white/40 sm:block" aria-hidden="true" />
          )}
          <button
            onClick={toggleFullscreen}
            className="rounded-lg bg-black/40 px-5 py-3 text-lg text-white hover:bg-black/60 active:bg-black/70"
          >
            {isFullscreen ? "Exit ⛶" : "Fullscreen ⛶"}
          </button>
          <button
            onClick={() => router.push("/")}
            className="rounded-lg bg-black/40 px-5 py-3 text-lg text-white hover:bg-black/60 active:bg-black/70"
          >
            Home
          </button>
        </div>
      )}
    </>
  );
}
