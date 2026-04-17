"use client";

import LongFormPlayer from "@/src/components/LongFormPlayer";
import EditorialVideosTicker from "@/src/components/EditorialVideosTicker";
import VideoPageControls from "@/src/components/VideoPageControls";

export default function EditorialLongFormPage() {
  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">
      <div className="flex-1 min-h-0">
        <LongFormPlayer className="h-full" />
      </div>
      <EditorialVideosTicker />
      <VideoPageControls />
    </div>
  );
}
