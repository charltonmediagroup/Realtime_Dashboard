"use client";

import { useEffect, useRef, useState } from "react";
import { Video } from "@/src/components/VideosPlayer";

interface ShortsPlayerProps {
  videos?: Video[];
  brand?: string;
  fetchUrl?: string;
  className?: string;
  rotationInterval?: number;
}

const SLOTS = 2;
const WAIT_MODE_KEY = "shortsWaitMode";
const WAIT_MODE_EVENT = "shortsModeChange";

export default function ShortsPlayer({
  videos: initialVideos,
  brand,
  fetchUrl,
  className = "",
  rotationInterval = 30_000,
}: ShortsPlayerProps) {
  const [videos, setVideos] = useState<Video[]>(initialVideos || []);
  const [loading, setLoading] = useState(!initialVideos);
  const [error, setError] = useState<string | null>(null);
  const [slotIndexes, setSlotIndexes] = useState<number[]>(
    Array.from({ length: SLOTS }, (_, i) => i),
  );
  const [waitMode, setWaitMode] = useState(false);
  const iframeRefs = useRef<(HTMLIFrameElement | null)[]>([]);
  const timer = useRef<NodeJS.Timeout | null>(null);

  // Fetch videos
  useEffect(() => {
    if (initialVideos) return;
    const url = fetchUrl || (brand ? `/api/videos/${brand}` : "/api/videos");
    setLoading(true);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch videos");
        return res.json();
      })
      .then(setVideos)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [brand, fetchUrl, initialVideos]);

  useEffect(() => {
    if (initialVideos?.length) setVideos(initialVideos);
  }, [initialVideos]);

  // Read wait mode from localStorage + listen for changes from controls
  useEffect(() => {
    const read = () => {
      setWaitMode(localStorage.getItem(WAIT_MODE_KEY) === "true");
    };
    read();
    window.addEventListener(WAIT_MODE_EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(WAIT_MODE_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);

  // Normal mode: rotate all slots together on interval
  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (waitMode) return;
    if (videos.length <= SLOTS || rotationInterval <= 0) return;
    timer.current = setInterval(() => {
      setSlotIndexes((prev) =>
        prev.map((i) => (i + SLOTS) % videos.length),
      );
    }, rotationInterval);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [waitMode, videos.length, rotationInterval]);

  // Wait mode: listen for Vimeo 'ended' postMessage, advance that slot only
  useEffect(() => {
    if (!waitMode) return;

    // Subscribe each iframe to the 'ended' event
    const subscribe = () => {
      iframeRefs.current.forEach((iframe) => {
        if (!iframe?.contentWindow) return;
        iframe.contentWindow.postMessage(
          JSON.stringify({ method: "addEventListener", value: "ended" }),
          "*",
        );
      });
    };
    const subTimer = setTimeout(subscribe, 800);

    const onMessage = (e: MessageEvent) => {
      try {
        const data =
          typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.event !== "ended") return;
        const slotId: string = data.player_id || "";
        const slotIdx = Number(slotId.replace("short-", ""));
        if (!Number.isInteger(slotIdx)) return;

        setSlotIndexes((prev) => {
          const next = [...prev];
          const taken = new Set(next.filter((_, i) => i !== slotIdx));
          let candidate = (next[slotIdx] + SLOTS) % videos.length;
          // avoid duplicating a video already visible in another slot
          let guard = 0;
          while (taken.has(candidate) && guard++ < videos.length) {
            candidate = (candidate + 1) % videos.length;
          }
          next[slotIdx] = candidate;
          return next;
        });
      } catch {
        /* ignore non-JSON messages */
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      clearTimeout(subTimer);
      window.removeEventListener("message", onMessage);
    };
  }, [waitMode, videos.length, slotIndexes]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center text-gray-400 py-12 ${className}`}
      >
        Loading shorts...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center text-red-400 py-12 ${className}`}
      >
        {error}
      </div>
    );
  }

  if (!videos.length) {
    return (
      <div
        className={`flex items-center justify-center text-gray-500 py-12 ${className}`}
      >
        No shorts available
      </div>
    );
  }

  // In wait mode: loop=0 so the 'ended' event fires. Normal mode: loop=1.
  const loopParam = waitMode ? 0 : 1;

  return (
    <div
      className={`flex items-center justify-evenly px-6 py-16 ${className}`}
    >
      {Array.from({ length: Math.min(SLOTS, videos.length) }).map((_, slot) => {
        const video = videos[slotIndexes[slot] % videos.length];
        if (!video) return null;
        const playerId = `short-${slot}`;
        return (
          <div key={slot} className="flex flex-col items-center">
            <div className="relative h-[80vh] aspect-[9/16] overflow-hidden rounded-lg">
              <iframe
                ref={(el) => {
                  iframeRefs.current[slot] = el;
                }}
                src={`https://player.vimeo.com/video/${video.id}?badge=0&autopause=0&autoplay=1&muted=1&controls=0&loop=${loopParam}&player_id=${playerId}&app_id=58479&api=1`}
                title={video.title}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p className="text-xl font-semibold mt-2 text-center uppercase line-clamp-1 text-gray-900">
              {video.title}
            </p>
          </div>
        );
      })}
    </div>
  );
}
