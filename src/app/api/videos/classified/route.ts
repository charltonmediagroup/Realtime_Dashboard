import { NextResponse } from "next/server";
import { getCachedVideos } from "@/lib/videosCache";
import {
  Department,
  VideoFormat,
  filterVideos,
} from "@/lib/videoClassify";

const DEPTS: Department[] = ["awards", "bizzcon", "editorial"];
const FORMATS: VideoFormat[] = ["long-form", "shorts"];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department") as Department | null;
    const format = searchParams.get("format") as VideoFormat | null;
    const forceBackfill =
      searchParams.get("backfill") === "true" ||
      searchParams.get("cache") === "false";

    if (!department || !DEPTS.includes(department)) {
      return NextResponse.json(
        { error: `department must be one of ${DEPTS.join(", ")}` },
        { status: 400 },
      );
    }
    if (!format || !FORMATS.includes(format)) {
      return NextResponse.json(
        { error: `format must be one of ${FORMATS.join(", ")}` },
        { status: 400 },
      );
    }

    const all = await getCachedVideos(undefined, forceBackfill);
    const filtered = filterVideos(all, department, format);

    return NextResponse.json(filtered);
  } catch (err) {
    console.error("API /videos/classified failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch classified videos" },
      { status: 500 },
    );
  }
}
