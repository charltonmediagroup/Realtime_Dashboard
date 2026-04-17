"use client";

import ShortsPlayer from "@/src/components/ShortsPlayer";
import EditorialVideosTicker from "@/src/components/EditorialVideosTicker";
import VideoPageControls from "@/src/components/VideoPageControls";

export default function EditorialShortsPage() {
  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">
      <div className="flex-1 min-h-0">
        <ShortsPlayer className="h-full" />
      </div>
      <EditorialVideosTicker />
      <VideoPageControls />
    </div>
  );
}
