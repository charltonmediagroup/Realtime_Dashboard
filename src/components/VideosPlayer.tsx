"use client";

import { useEffect, useState } from "react";
import VimeoEmbed from "@/src/components/VimeoEmbed";

export interface Video {
  id: string;
  title: string;
  description: string;
  duration: number;
  thumbnail: string;
  createdTime: string;
  link: string;
  tags: string[];
}

interface VideosPlayerProps {
  videos?: Video[];
  brand?: string;
  className?: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideosPlayer({
  videos: initialVideos,
  brand,
  className = "",
}: VideosPlayerProps) {
  const [videos, setVideos] = useState<Video[]>(initialVideos || []);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(!initialVideos);
  const [error, setError] = useState<string | null>(null);

  // Fetch from API if no videos prop provided
  useEffect(() => {
    if (initialVideos) return;
    const url = brand ? `/api/videos/${brand}` : "/api/videos";
    setLoading(true);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch videos");
        return res.json();
      })
      .then((data) => {
        setVideos(data);
        setSelectedVideo(data[0] || null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [brand, initialVideos]);

  // Set initial selected when videos prop changes
  useEffect(() => {
    if (initialVideos?.length) setSelectedVideo(initialVideos[0]);
  }, [initialVideos]);

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

  return (
    <div className={`flex flex-col bg-gray-950 text-white ${className}`}>
      {/* Player */}
      {selectedVideo && (
        <div className="w-full px-4 pt-4">
          <VimeoEmbed videoId={selectedVideo.id} title={selectedVideo.title} />
          <h2 className="text-lg font-semibold mt-3 uppercase">
            {selectedVideo.title}
          </h2>
          {selectedVideo.description && (
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">
              {selectedVideo.description}
            </p>
          )}
        </div>
      )}

      {/* Video list */}
      <div className="overflow-y-auto mt-4 px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-4">
          {videos.map((video) => (
            <button
              key={video.id}
              onClick={() => setSelectedVideo(video)}
              className={`text-left rounded-lg overflow-hidden transition-all ${
                selectedVideo?.id === video.id
                  ? "ring-2 ring-blue-500"
                  : "hover:ring-1 hover:ring-gray-600"
              }`}
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
                <p className="text-sm font-medium line-clamp-2 uppercase">
                  {video.title}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
