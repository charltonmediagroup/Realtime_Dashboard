import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";
import { getAwards, Brand } from "@/lib/GetAwards";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("cache") === "false";

    const col = await getCollection("dashboard-config");
    const doc = await col.findOne({ uid: "brand-all-properties" });
    const config = doc?.data || {};

    const brands: Brand[] = Object.entries(config)
      .filter(([, site]: any) => site?.awards && site?.url)
      .map(([brand, site]: any) => ({ brand, ...site }));

    const allAwards = await getAwards(brands, forceRefresh);

    return NextResponse.json(allAwards);
  } catch (err) {
    console.error("API /awards failed:", err);
    return NextResponse.json({ error: "Failed to fetch awards" }, { status: 500 });
  }
}
