import * as cheerio from "cheerio";

export interface Brand {
  brand: string;
  name: string;
  url: string;
}

export interface Award {
  id: string;
  brand: string;
  title: string;
  field_date: string;
  view_node: string;
  startDate?: string | null;
  endDate?: string | null;
  image?: string;
  city?: string | null;
  contactPerson?: string | null;
}

/* ---------------- HELPERS ---------------- */
function normalizeTitle(str?: string) {
  if (!str) return "";
  return str
    .replace(/&amp;/gi, "&")
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getBestSrcFromSrcset(srcset?: string) {
  if (!srcset) return undefined;
  return srcset.split(",").map((s) => s.trim().split(" ")[0]).pop();
}

async function safeFetch(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed fetch: ${url} (${res.status})`);
  return res;
}

/* ---------------- CITY DETECTION ---------------- */
const KNOWN_LOCATIONS = [
  // Cities
  "Singapore", "Hong Kong", "Bangkok", "Manila", "Jakarta",
  "Kuala Lumpur", "Ho Chi Minh", "Hanoi", "Phnom Penh", "Yangon",
  "Taipei", "Seoul", "Tokyo", "Shanghai", "Beijing", "Shenzhen",
  "Mumbai", "New Delhi", "Dubai", "Sydney", "Melbourne",
  "Macau", "Cebu", "Davao", "Colombo", "Dhaka",
  // Countries
  "Malaysia", "Indonesia", "Thailand", "Philippines", "Vietnam",
  "Cambodia", "Myanmar", "India", "Sri Lanka", "Bangladesh",
  "Australia", "New Zealand", "Japan", "South Korea", "Taiwan",
  "China", "UAE", "Saudi Arabia", "Qatar", "Bahrain", "Oman", "Kuwait",
  // Regions
  "Greater Bay Area",
];

function matchLocation(text: string): string | null {
  const lower = text.toLowerCase();
  for (const loc of KNOWN_LOCATIONS) {
    const regex = new RegExp(`\\b${loc.toLowerCase()}\\b`);
    if (regex.test(lower)) return loc;
  }
  return null;
}

function detectCity(title: string, pageText?: string): string | null {
  // 1. Try scraping page text for explicit venue mentions
  if (pageText) {
    const patterns = [
      /(?:will be |is being )?held (?:at|in)\s+([^,.\n]{3,60})/i,
      /takes place (?:at|in)\s+([^,.\n]{3,60})/i,
      /ceremony (?:at|in)\s+([^,.\n]{3,60})/i,
      /awards night (?:at|in)\s+([^,.\n]{3,60})/i,
    ];
    for (const pat of patterns) {
      const m = pageText.match(pat);
      if (m) {
        const loc = matchLocation(m[1]);
        if (loc) return loc;
      }
    }
  }

  // 2. Fall back to title
  return matchLocation(title);
}

/* ---------------- CONTACT PERSON DETECTION ---------------- */
function detectContactPerson($: cheerio.CheerioAPI, pageText: string): string | null {
  // Method 1: structured HTML — section.block-contact-data > strong
  const section = $("section.block-contact-data").first();
  if (section.length) {
    const name = section.find("strong").first().text().trim();
    if (name) return name;
  }

  // Method 2: regex on page text — "For more details, contact: FirstName LastName"
  const match = pageText.match(/For more details,\s*contact:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
  if (match) return match[1].trim();

  return null;
}

/* ---------------- BATCH HELPER ---------------- */
const BATCH_SIZE = 5;

async function processInBatches<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

/* ---------------- CACHE ---------------- */
let awardsCache: { data: Award[]; timestamp: number } | null = null;
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 1 week
const MONGO_CACHE_UID = "awards-cache";
let refreshInProgress = false;

async function getCachedAwardsFromDB(): Promise<{ data: Award[]; timestamp: number } | null> {
  try {
    const { getCollection } = await import("@/lib/mongodb");
    const col = await getCollection("dashboard-config");
    const doc = await col.findOne({ uid: MONGO_CACHE_UID });
    if (doc?.data && doc?.timestamp) {
      return { data: doc.data as Award[], timestamp: doc.timestamp as number };
    }
  } catch (err) {
    console.warn("Failed to read awards cache from MongoDB:", err);
  }
  return null;
}

async function saveCacheToDB(data: Award[]) {
  try {
    const { getCollection } = await import("@/lib/mongodb");
    const col = await getCollection("dashboard-config");
    await col.updateOne(
      { uid: MONGO_CACHE_UID },
      { $set: { uid: MONGO_CACHE_UID, data, timestamp: Date.now() } },
      { upsert: true },
    );
  } catch (err) {
    console.warn("Failed to save awards cache to MongoDB:", err);
  }
}

/* ---------------- MAIN SCRAPER ---------------- */
export async function getAwards(brands: Brand[], forceRefresh = false): Promise<Award[]> {
  // 1. Return from in-memory cache if fresh
  if (!forceRefresh && awardsCache && Date.now() - awardsCache.timestamp < CACHE_DURATION) {
    return awardsCache.data;
  }

  // 2. Try MongoDB cache for fast initial load
  if (!forceRefresh) {
    const dbCache = await getCachedAwardsFromDB();
    if (dbCache && Date.now() - dbCache.timestamp < CACHE_DURATION) {
      awardsCache = dbCache;
      return dbCache.data;
    }
    // If DB cache exists but is stale, return it immediately and refresh in background
    if (dbCache && dbCache.data.length > 0 && !refreshInProgress) {
      awardsCache = dbCache;
      refreshInProgress = true;
      scrapeAndCache(brands).finally(() => { refreshInProgress = false; });
      return dbCache.data;
    }
  }

  // 3. No cache available — scrape synchronously
  return scrapeAndCache(brands);
}

/* ---------------- SCRAPE & CACHE ---------------- */
async function scrapeAndCache(brands: Brand[]): Promise<Award[]> {
  // 1. Fetch JSON lists for all brands (lightweight, parallel is fine)
  const awardsRawArr = await Promise.all(
    brands.map(async (b) => {
      try {
        const res = await safeFetch(`${b.url}/node/content-menu/awards.json`);
        const json = await res.json();
        return Array.isArray(json) ? json : [];
      } catch {
        console.warn("Failed brand:", b.brand);
        return [];
      }
    })
  );

  let awardsRaw = awardsRawArr.flat();

  // 2. Attach brand and generate id
  awardsRaw = awardsRaw.map((a: Record<string, unknown>, idx: number) => {
    const brand = brands.find((b) =>
      normalizeTitle(a.view_node as string).startsWith(normalizeTitle(b.url))
    );
    return {
      ...a,
      id: (a.view_node as string) || `award-${idx}`,
      brand: brand?.brand || "unknown",
    };
  });

  // 3. Deduplicate
  const uniqueMap = new Map<string, Award>();
  for (const a of awardsRaw) {
    const title = a.title as string;
    const fieldDate = a.field_date as string;
    if (!title || !fieldDate) continue;
    const key = normalizeTitle(title) + "_" + new Date(fieldDate).toISOString().split("T")[0];
    if (!uniqueMap.has(key)) uniqueMap.set(key, a as Award);
  }

  // 4. Sort by date BEFORE scraping — upcoming awards get processed first
  const uniqueAwards = Array.from(uniqueMap.values()).sort(
    (a, b) => new Date(a.field_date).getTime() - new Date(b.field_date).getTime(),
  );

  // 5. Fetch nomination dates (batched) AND images (per brand) in parallel
  const [awardsWithDates, imageMapsArr] = await Promise.all([
    processInBatches(uniqueAwards, async (award) => {
      try {
        const html = await safeFetch(award.view_node).then((r) => r.text());
        const $ = cheerio.load(html);
        const pageText = $("body").text();
        return {
          ...award,
          startDate: $(".nomination-date .start-date").attr("date") || null,
          endDate: $(".nomination-date .end-date").attr("date") || null,
          city: detectCity(award.title, pageText),
          contactPerson: detectContactPerson($, pageText),
        };
      } catch {
        return { ...award, startDate: null, endDate: null, city: detectCity(award.title), contactPerson: null };
      }
    }),
    Promise.all(brands.map((b) => fetchAwardImagesMap(b.url))),
  ]);

  // 6. Map images to awards
  const brandImageMaps: Record<string, Record<string, string>> = {};
  brands.forEach((b, i) => (brandImageMaps[b.brand] = imageMapsArr[i] || {}));

  const awardsWithImages = awardsWithDates.map((a) => {
    const brandMap = brandImageMaps[a.brand];
    if (!brandMap) return a;
    const normalized = normalizeTitle(a.title);
    for (const [scrapedTitle, img] of Object.entries(brandMap)) {
      if (scrapedTitle.includes(normalized) || normalized.includes(scrapedTitle)) {
        return { ...a, image: img };
      }
    }
    return a;
  });

  awardsCache = { data: awardsWithImages, timestamp: Date.now() };
  saveCacheToDB(awardsWithImages);
  return awardsWithImages;
}

/* ---------------- IMAGE SCRAPER ---------------- */
async function fetchAwardImagesMap(siteUrl: string) {
  try {
    const html = await safeFetch(`${siteUrl}/awards`).then((r) => r.text());
    const $ = cheerio.load(html);
    const map: Record<string, string> = {};

    $(".view-content .item.with-border-bottom, .elementor-widget-image-box, .elementor-widget-image").each((_, el) => {
      const title =
        $(el).find(".item__title a, .elementor-image-box-title, a").first().text()?.trim() ||
        $(el).find("img").attr("alt") ||
        $(el).find("a").attr("title");
      if (!title) return;

      let img =
        getBestSrcFromSrcset($(el).find("img").attr("data-srcset")) ||
        getBestSrcFromSrcset($(el).find("img").attr("srcset")) ||
        $(el).find("img").attr("data-src") ||
        $(el).find("img").attr("data-lazy-src") ||
        $(el).find("img").attr("src");

      if (img && !img.startsWith("http")) img = new URL(img, siteUrl).href;
      if (img) map[normalizeTitle(title)] = img;
    });

    return map;
  } catch {
    return {};
  }
}
