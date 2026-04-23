"use client";

import Link from "next/link";
import ShortsPlayer from "@/src/components/ShortsPlayer";
import EditorialVideosTicker from "@/src/components/EditorialVideosTicker";
import DashboardControls from "@/src/components/DashboardControls";
import WaitModeToggle from "@/src/components/WaitModeToggle";

export default function AwardsShortsPage() {
  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <div className="flex-1 min-h-0">
        <ShortsPlayer
          className="h-full"
          fetchUrl="/api/videos/classified?department=awards&format=shorts"
        />
      </div>
      <EditorialVideosTicker />
      <DashboardControls>
        <WaitModeToggle />
        <Link href="/dashboard/awards" className="px-4 py-2 rounded bg-black/40 text-white hover:bg-black/60">← Back</Link>
      </DashboardControls>
    </div>
  );
}
