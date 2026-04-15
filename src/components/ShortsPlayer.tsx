"use client";

import { useEffect, useRef, useState } from "react";
import VimeoEmbed from "@/src/components/VimeoEmbed";
import { Video } from "@/src/components/VideosPlayer";

interface ShortsPlayerProps {
  videos?: Video[];
  brand?: string;
  className?: string;
  rotationInterval?: number;
}

export default function ShortsPlayer({
  videos: initialVideos,
  brand,
  className = "",
  rotationInterval = 30_000,
}: ShortsPlayerProps) {
  const [videos, setVideos] = useState<Video[]>(initialVideos || []);
  const [loading, setLoading] = useState(!initialVideos);
  const [error, setError] = useState<string | null>(null);
  const [startIndex, setStartIndex] = useState(0);
  const timer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (initialVideos) return;
    const url = brand ? `/api/videos/${brand}` : "/api/videos";
    setLoading(true);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch videos");
        return res.json();
      })
      .then(setVideos)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [brand, initialVideos]);

  useEffect(() => {
    if (initialVideos?.length) setVideos(initialVideos);
  }, [initialVideos]);

  // Auto-rotate the 3 visible shorts
  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (videos.length <= 3 || rotationInterval <= 0) return;
    timer.current = setInterval(() => {
      setStartIndex((i) => (i + 3) % videos.length);
    }, rotationInterval);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [videos.length, rotationInterval]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center text-gray-400 py-12 ${className}`}>
        Loading shorts...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center text-red-400 py-12 ${className}`}>
        {error}
      </div>
    );
  }

  if (!videos.length) {
    return (
      <div className={`flex items-center justify-center text-gray-500 py-12 ${className}`}>
        No shorts available
      </div>
    );
  }

  // Pick 3 videos starting from startIndex, wrapping around
  const visible: Video[] = [];
  for (let i = 0; i < Math.min(3, videos.length); i++) {
    visible.push(videos[(startIndex + i) % videos.length]);
  }

  return (
    <div className={`flex items-center justify-center gap-4 bg-gray-950 text-white px-4 ${className}`}>
      {visible.map((video) => (
        <div key={video.id} className="flex-1 max-w-[30%] flex flex-col items-center">
          <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingBottom: "177.78%" }}>
            <iframe
              src={`https://player.vimeo.com/video/${video.id}?badge=0&autopause=0&autoplay=1&muted=1&loop=1&player_id=0&app_id=58479`}
              title={video.title}
              className="absolute inset-0 w-full h-full"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
          <p className="text-sm font-semibold mt-2 text-center uppercase line-clamp-1">
            {video.title}
          </p>
        </div>
      ))}
    </div>
  );
}
