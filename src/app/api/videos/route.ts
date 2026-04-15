import { NextResponse } from "next/server";
import { getCachedVideos } from "@/lib/videosCache";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("cache") === "false";

    const videos = await getCachedVideos(undefined, forceRefresh);

    return NextResponse.json(videos);
  } catch (err) {
    console.error("API /videos failed:", err);
    return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 });
  }
}
