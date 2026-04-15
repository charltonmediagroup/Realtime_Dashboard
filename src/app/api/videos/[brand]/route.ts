import { NextResponse, NextRequest } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { getCachedVideos } from "@/lib/videosCache";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ brand: string }> },
) {
  try {
    const { brand } = await params;
    const forceRefresh = req.nextUrl.searchParams.get("cache") === "false";

    const col = await getCollection("dashboard-config");
    const doc = await col.findOne(
      { uid: "brand-all-properties", [`data.${brand}`]: { $exists: true } },
      { projection: { [`data.${brand}`]: 1 } },
    );

    const site = doc?.data?.[brand];
    const vimeoTag = site?.vimeo?.tag || brand;

    if (!site?.vimeo?.enabled) {
      return NextResponse.json(
        { error: "Brand not found or videos not enabled" },
        { status: 404 },
      );
    }

    const videos = await getCachedVideos(vimeoTag, forceRefresh);

    return NextResponse.json(videos);
  } catch (err) {
    console.error(`API /videos/${(await params).brand} failed:`, err);
    return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 });
  }
}
