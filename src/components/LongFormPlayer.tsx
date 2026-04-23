"use client";

import { useEffect, useRef, useState } from "react";
import VimeoEmbed from "@/src/components/VimeoEmbed";
import { Video } from "@/src/components/VideosPlayer";

interface LongFormPlayerProps {
  videos?: Video[];
  brand?: string;
  fetchUrl?: string;
  className?: string;
  rotationInterval?: number;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function LongFormPlayer({
  videos: initialVideos,
  brand,
  fetchUrl,
  className = "",
  rotationInterval = 60_000,
}: LongFormPlayerProps) {
  const [videos, setVideos] = useState<Video[]>(initialVideos || []);
  const [loading, setLoading] = useState(!initialVideos);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const timer = useRef<NodeJS.Timeout | null>(null);

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

  // Auto-rotate which video is featured
  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (videos.length <= 1 || rotationInterval <= 0) return;
    timer.current = setInterval(() => {
      setActiveIndex((i) => (i + 1) % videos.length);
    }, rotationInterval);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [videos.length, rotationInterval]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center text-gray-400 py-12 ${className}`}>
        Loading videos...
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
        No videos available
      </div>
    );
  }

  const featured = videos[activeIndex];

  // Pick up to 4 sidebar videos (excluding featured), wrapping around
  const sidebar: Video[] = [];
  for (let i = 1; i <= Math.min(4, videos.length - 1); i++) {
    sidebar.push(videos[(activeIndex + i) % videos.length]);
  }

  return (
    <div className={`flex bg-gray-950 text-white h-full ${className}`}>
      {/* Main large video */}
      <div className="flex-1 flex flex-col p-4">
        <VimeoEmbed videoId={featured.id} title={featured.title} autoplay />
        <h2 className="text-xl font-bold mt-3 uppercase">{featured.title}</h2>
        {featured.description && (
          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
            {featured.description}
          </p>
        )}
      </div>

      {/* Right sidebar — 4 smaller videos */}
      {sidebar.length > 0 && (
        <div className="w-72 flex flex-col gap-2 p-4 overflow-y-auto flex-shrink-0">
          {sidebar.map((video, i) => (
            <button
              key={video.id}
              onClick={() => setActiveIndex((activeIndex + i + 1) % videos.length)}
              className={`text-left rounded-lg overflow-hidden transition-all hover:ring-1 hover:ring-gray-600`}
            >
              <div className="relative">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full aspect-video object-cover"
                />
                <span className="absolute bottom-1 right-1 bg-black/80 text-xs px-1.5 py-0.5 rounded font-mono">
                  {formatDuration(video.duration)}
                </span>
              </div>
              <div className="p-2">
                <p className="text-xs font-medium line-clamp-2 uppercase">
                  {video.title}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
