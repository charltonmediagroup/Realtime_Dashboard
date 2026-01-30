import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongodb";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// In-memory cache (per server instance)
const cache: Record<string, CacheEntry<unknown>> = {};

// Cache TTL: 1 day
const CACHE_TTL = 24 * 60 * 60 * 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // or your domain
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};


/**
 * Convert query string values to correct types
 */
function parseValue(value: string) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (!isNaN(Number(value))) return Number(value);
  return value;
}

/**
 * Build filter object from query params
 */
function buildMongoFilter(searchParams: URLSearchParams) {
  const filter: Record<string, any> = {};

  for (const [key, value] of searchParams.entries()) {
    if (!key.startsWith("filter[")) continue;

    const match = key.match(
      /^filter\[(.+?)\](?:\[(gt|lt|gte|lte|ne)\])?$/
    );
    if (!match) continue;

    const [, field, operator] = match;
    const parsedValue = parseValue(value);

    if (!operator) {
      filter[field] = parsedValue;
    } else {
      filter[field] ??= {};
      filter[field][`$${operator}`] = parsedValue;
    }
  }

  return filter;
}

/**
 * Build MongoDB sort object
 */
function buildMongoSort(sortParam: string | null) {
  if (!sortParam) return undefined;

  const sort: Record<string, 1 | -1> = {};

  sortParam.split(",").forEach((field) => {
    if (field.startsWith("-")) {
      sort[field.slice(1)] = -1;
    } else {
      sort[field] = 1;
    }
  });

  return sort;
}

/**
 * Filter object-map data (presence-aware)
 *
 * true  => field exists and is true
 * false => field does NOT exist
 */
function filterObjectMap(
  data: Record<string, any>,
  filters: Record<string, any>
) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => {
      return Object.entries(filters).every(([field, expected]) => {
        if (expected === true) {
          return value?.[field] === true;
        }

        if (expected === false) {
          return !(field in value);
        }

        return value?.[field] === expected;
      });
    })
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ collection?: string; document?: string }> },
) {
  try {
    const { collection, document } = await params;
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    const useCache = searchParams.get("cache") !== "false";
    const now = Date.now();

    const targetCollection = collection ?? "defaultCollection";

    const cacheKey = `${targetCollection}:${document ?? "list"}:${searchParams.toString()}`;

    // Serve from cache
    if (useCache) {
      const cached = cache[cacheKey];
      if (cached && cached.expiresAt > now) {
        return NextResponse.json(cached.data, { headers: corsHeaders });
      }
    }

    const col = await getCollection(targetCollection);

    /**
     * 🔹 SINGLE DOCUMENT MODE (object-map filtering)
     */
    if (document) {
      const doc = await col.findOne<{ uid: string; data?: unknown }>({
        uid: document,
      });

      if (!doc) {
        return NextResponse.json(
          { error: "Document not found" },
          { status: 404 },
        );
      }

      let result: any = doc.data ?? doc;
      const filters = buildMongoFilter(searchParams);

      if (
        result &&
        typeof result === "object" &&
        !Array.isArray(result) &&
        Object.keys(filters).length > 0
      ) {
        result = filterObjectMap(result as Record<string, any>, filters);
      }

      cache[cacheKey] = {
        data: result,
        expiresAt: now + CACHE_TTL,
      };

      return NextResponse.json(result, { headers: corsHeaders });
    }

    /**
     * 🔹 COLLECTION QUERY MODE (native Mongo filtering)
     */
    const filter = buildMongoFilter(searchParams);
    const sort = buildMongoSort(searchParams.get("sort"));
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
    const skip = Number(searchParams.get("skip") ?? 0);

    const cursor = col.find(filter).skip(skip).limit(limit);
    if (sort) cursor.sort(sort);

    const results = await cursor.toArray();

    cache[cacheKey] = {
      data: results,
      expiresAt: now + CACHE_TTL,
    };

    return NextResponse.json(results, { headers: corsHeaders });
  } catch (err) {
    console.error("JSON Provider Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", message: (err as Error).message },
      { status: 500 },
    );
  }
}
