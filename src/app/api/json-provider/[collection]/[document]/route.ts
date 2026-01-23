// /api/json-provider/[collection]/[document]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

interface CacheEntry<T> {
  data: T;
  expiresAt: number; // timestamp in ms
}

// In-memory cache
const cache: Record<string, CacheEntry<unknown>> = {};

// Cache TTL (e.g., 1 day)
const CACHE_TTL = 24 * 60 * 60 * 1000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ collection?: string; document?: string }> },
) {
  try {
    const { collection, document } = await params;
    const url = new URL(req.url);
    const useCache = url.searchParams.get("cache") !== "false"; // default: true

    // Define cache key
    const cacheKey = `${collection ?? "default"}:${document ?? "default"}`;
    const now = Date.now();

    // Serve from cache if allowed and exists
    if (useCache) {
      const cached = cache[cacheKey];
      if (cached && cached.expiresAt > now) {
        return NextResponse.json(cached.data);
      }
    }

    // If no collection/document provided → use default
    const targetCollection = collection ?? "defaultCollection";
    const targetDocument = document ?? "defaultDocument";

    // Fetch from MongoDB
    const col = await getCollection(targetCollection);
    const doc = await col.findOne<{ uid: string; data: unknown }>({
      uid: targetDocument,
    });

    console.log(
      `[MongoDB] Fetched document ${targetDocument} from collection ${targetCollection}`,
    );

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    // Update cache
    const dataToCache = doc.data ?? doc;

    cache[cacheKey] = {
      data: dataToCache,
      expiresAt: now + CACHE_TTL,
    };

    return NextResponse.json(dataToCache);
  } catch (err) {
    console.error("Failed to fetch document:", err);
    return NextResponse.json(
      { error: "Internal Server Error", message: (err as Error).message },
      { status: 500 },
    );
  }
}
