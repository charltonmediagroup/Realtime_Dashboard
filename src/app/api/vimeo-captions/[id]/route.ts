import { NextResponse } from "next/server";

// Server-side proxy for Vimeo caption fetching. Uses Vimeo's official API
// (api.vimeo.com) with a Bearer token from VIMEO_ACCESS_TOKEN. This is the
// documented, stable path — necessary because player.vimeo.com/config
// rejects cross-origin and server-side requests with 403.
//
// Flow:
//   1. GET /videos/{id}/texttracks  →  list of caption tracks with direct .vtt links
//   2. Pick the active/first caption track
//   3. Fetch the .vtt body and stream it back to the client

interface VimeoTextTrack {
  active?: boolean;
  type?: string; // "captions" | "subtitles" | ...
  language?: string;
  link?: string; // direct VTT URL (signed)
  name?: string;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return new NextResponse("invalid id", { status: 400 });
  }

  const token = process.env.VIMEO_ACCESS_TOKEN;
  if (!token) {
    console.error("vimeo-captions: VIMEO_ACCESS_TOKEN not set");
    return new NextResponse("token missing", { status: 500 });
  }

  try {
    const listRes = await fetch(`https://api.vimeo.com/videos/${id}/texttracks`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.vimeo.*+json;version=3.4",
      },
      cache: "no-store",
    });
    if (!listRes.ok) {
      return new NextResponse("", { status: listRes.status });
    }

    const body: { data?: VimeoTextTrack[] } = await listRes.json();
    const tracks = body.data ?? [];
    const track =
      tracks.find(t => t.active && t.type === "captions") ??
      tracks.find(t => t.type === "captions") ??
      tracks.find(t => t.type === "subtitles") ??
      tracks[0];

    if (!track?.link) {
      return new NextResponse("", { status: 404 });
    }

    const vttRes = await fetch(track.link, { cache: "no-store" });
    if (!vttRes.ok) {
      return new NextResponse("", { status: vttRes.status });
    }

    return new NextResponse(await vttRes.text(), {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        // Caption text rarely changes; cache at the edge for an hour.
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error(`vimeo-captions/${id} failed:`, err);
    return new NextResponse("", { status: 500 });
  }
}
