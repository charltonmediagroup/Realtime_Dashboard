"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface DashboardControlsProps {
  children?: ReactNode;
  className?: string;
  /** Hide the built-in Fullscreen button (e.g. pages with only a Home action). */
  showFullscreen?: boolean;
  /** When false, only the handle button opens the panel (no bottom-zone tap). */
  openOnBottomTap?: boolean;
}

export default function DashboardControls({
  children,
  className = "",
  showFullscreen = true,
  openOnBottomTap = true,
}: DashboardControlsProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Mirror `visible` in a ref so the (mount-only) pointerdown listener can read
  // the current value without re-subscribing.
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  // Touch devices get the tap-outside-to-close modal; desktop/TV keep auto-hide.
  const [isTouch, setIsTouch] = useState(false);
  const isTouchRef = useRef(isTouch);
  isTouchRef.current = isTouch;

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    setIsFullscreen(!!document.fullscreenElement);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const apply = () => setIsTouch(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Non-touch (desktop/TV): auto-hide the overlay 5s after the last activity.
  // Touch devices dismiss via the backdrop instead, so skip the timer there.
  useEffect(() => {
    if (!visible || isTouch) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), 5000);
    };
    reset();
    window.addEventListener("pointermove", reset);
    window.addEventListener("keydown", reset);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointermove", reset);
      window.removeEventListener("keydown", reset);
    };
  }, [visible, isTouch]);

  // Toggle the overlay when tapping/clicking the bottom quarter of the screen.
  // A single pointer handler covers mouse + touch + pen. Using `pointerdown`
  // (instead of separate click + touchstart listeners) avoids the double-fire
  // on phones, where a tap fired touchstart AND a synthetic click — toggling
  // the overlay on then immediately off, so it never appeared.
  useEffect(() => {
    if (!openOnBottomTap) return; // the handle button is the only way to open
    const onPointerDown = (e: PointerEvent) => {
      if (e.target instanceof Node && containerRef.current?.contains(e.target))
        return;
      // Bottom tap zone. On touch, keep it to a thin strip at the very bottom
      // (just the handle band) so tapping the story links above never opens the
      // controls by mistake. Non-touch (desktop/TV) keeps the larger 25%/≥140px
      // zone since there are no inline links to fat-finger there.
      const zone = isTouchRef.current
        ? 64
        : Math.max(window.innerHeight * 0.25, 140);
      if (e.clientY < window.innerHeight - zone) return;
      if (isTouchRef.current) {
        // Touch: the bottom-tap only opens; the backdrop handles closing.
        if (!visibleRef.current) setVisible(true);
      } else {
        setVisible((v) => !v);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [openOnBottomTap]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <>
      {/* Always-on handle so touch users can open the controls. Must be a real
          tap target (the 6px bar was unhittable) and visible on BOTH light and
          dark pages — hence the dark pill with a light grabber inside. */}
      {!visible && (
        <button
          type="button"
          aria-label="Show controls"
          onClick={() => setVisible(true)}
          className={`fixed bottom-2 left-1/2 -translate-x-1/2 z-40 flex h-8 w-20 items-center justify-center rounded-full touch-manipulation ${
            isTouch
              ? "bg-black/10 ring-1 ring-white/15"
              : "bg-black/40 ring-1 ring-white/25 backdrop-blur-sm"
          }`}
        >
          <span
            className={`h-1 w-9 rounded-full ${isTouch ? "bg-white/90 shadow-sm shadow-black/40" : "bg-white/80"}`}
            aria-hidden="true"
          />
        </button>
      )}

      {/* Touch only — closes the panel on an outside tap and blocks taps from
          reaching links/buttons behind it while the controls are open. */}
      {visible && isTouch && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setVisible(false)}
        />
      )}

      {visible && (
        <div
          ref={containerRef}
          className={`dash-controls fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex max-w-[92vw] flex-wrap items-center justify-center gap-3 rounded-2xl bg-gray-500/30 px-3 py-2 text-base shadow-lg ring-1 ring-white/15 backdrop-blur-md touch-manipulation select-none ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
          {children && (
            <span className="hidden h-8 w-px bg-white/40 sm:block" aria-hidden="true" />
          )}
          {showFullscreen && (
            <button
              onClick={toggleFullscreen}
              className="rounded-lg bg-black/40 px-5 py-3 text-lg text-white hover:bg-black/60 active:bg-black/70"
            >
              {isFullscreen ? "Exit ⛶" : "Fullscreen ⛶"}
            </button>
          )}
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
