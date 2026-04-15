import * as cheerio from "cheerio";

export interface EventBrand {
  brand: string;
  name: string;
  url: string;
  image?: string;
}

export interface BizzconEvent {
  id: string;
  brand: string;
  title: string;
  eventDate: string;
  link: string;
  image?: string;
  city?: string | null;
  venue?: string | null;
  registrationUrl?: string | null;
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

async function safeFetch(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Failed fetch: ${url} (${res.status})`);
    }
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/xml") || contentType.includes("text/xml")) {
      throw new Error(`Invalid content type for ${url}: ${contentType}`);
    }
    return res;
  } catch (err) {
    console.error(`Fetch error for ${url}:`, err);
    throw err;
  }
}

/* ---------------- CITY DETECTION ---------------- */
const KNOWN_LOCATIONS = [
  "Singapore", "Hong Kong", "Bangkok", "Manila", "Jakarta",
  "Kuala Lumpur", "Ho Chi Minh", "Hanoi", "Phnom Penh", "Yangon",
  "Taipei", "Seoul", "Tokyo", "Shanghai", "Beijing", "Shenzhen",
  "Mumbai", "New Delhi", "Dubai", "Sydney", "Melbourne",
  "Macau", "Cebu", "Davao", "Colombo", "Dhaka",
  "Malaysia", "Indonesia", "Thailand", "Philippines", "Vietnam",
  "Cambodia", "Myanmar", "India", "Sri Lanka", "Bangladesh",
  "Australia", "New Zealand", "Japan", "South Korea", "Taiwan",
  "China", "UAE", "Saudi Arabia", "Qatar", "Bahrain", "Oman", "Kuwait",
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

/* ---------------- PARSE DATE FROM TITLE OR PAGE ---------------- */
function parseDateFromTitle(title: string): string | null {
  // Match patterns like "April 28, 2026" or "May 13, 2026" in the title
  const match = title.match(
    /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
  );
  if (match) {
    const d = new Date(match[0]);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

function parseDateFromPage($: cheerio.CheerioAPI): string | null {
  // Look for start-date element under bf-presentation-date
  const startDate = $(".bf-presentation-date .start-date").first().text().trim();
  if (startDate) {
    const d = new Date(startDate);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

/* ---------------- CLEAN TITLE ---------------- */
function cleanEventTitle(title: string): string {
  // Remove trailing " - Location - Date" parts
  // e.g. "Retail Asia Summit - Thailand - April 30, 2026" -> "Retail Asia Summit"
  return title
    .replace(/\s*-\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}$/i, "")
    .replace(/\s*-\s*(?:Singapore|Hong Kong|Bangkok|Manila|Jakarta|Kuala Lumpur|Ho Chi Minh|Hanoi|Phnom Penh|Yangon|Taipei|Seoul|Tokyo|Shanghai|Beijing|Shenzhen|Mumbai|New Delhi|Dubai|Sydney|Melbourne|Macau|Cebu|Davao|Colombo|Dhaka|Malaysia|Indonesia|Thailand|Philippines|Vietnam|Cambodia|Myanmar|India|Sri Lanka|Bangladesh|Australia|New Zealand|Japan|South Korea|Taiwan|China|UAE|Saudi Arabia|Qatar|Bahrain|Oman|Kuwait|Greater Bay Area)$/i, "")
    .trim();
}

/* ---------------- MAIN SCRAPER ---------------- */
export async function getEvents(brands: EventBrand[]): Promise<BizzconEvent[]> {
  // 1. Scrape events listing pages for all brands
  const eventsRawArr = await Promise.all(
    brands.map(async (b) => {
      try {
        const html = await safeFetch(`${b.url}/events`).then((r) => r.text());
        const $ = cheerio.load(html);
        const events: { title: string; link: string; brand: string; image?: string }[] = [];

        // Events are in the conferences menu and also in the main content area
        // Look for event links in the page
        $('a[href*="/event/"]').each((_, el) => {
          const href = $(el).attr("href");
          const title = $(el).text().trim();
          if (!href || !title || title.length < 10) return;

          // Skip award-type events (they belong in awards department)
          if (href.includes("award")) return;

          const fullUrl = href.startsWith("http") ? href : `${b.url}${href}`;

          // Avoid duplicates within same brand — use brand logo
          if (!events.find((e) => e.link === fullUrl)) {
            events.push({ title, link: fullUrl, brand: b.brand, image: b.image ? `/${b.image}` : undefined });
          }
        });

        return events;
      } catch (err) {
        console.warn(`Failed to fetch brand events for ${b.brand}:`, (err as Error).message);
        return [];
      }
    }),
  );

  const eventsRaw = eventsRawArr.flat();

  // 2. Deduplicate by link
  const uniqueMap = new Map<string, (typeof eventsRaw)[0]>();
  for (const e of eventsRaw) {
    if (!uniqueMap.has(e.link)) uniqueMap.set(e.link, e);
  }

  // 3. Fetch detail pages for each event (batched)
  const detailedEvents = await processInBatches(
    Array.from(uniqueMap.values()),
    async (raw) => {
      try {
        const html = await safeFetch(raw.link).then((r) => r.text());
        const $ = cheerio.load(html);

        const eventDate = parseDateFromPage($) || parseDateFromTitle(raw.title) || "";
        const city = matchLocation(raw.title) || matchLocation($("body").text().slice(0, 2000));
        // Venue
        const venueEl = $(".bf-label:contains('Venue')").closest(".field-type-date").find("div").last().text().trim();
        const venue = venueEl || null;

        // Registration URL
        const regLink = $("a:contains('Register Now')").attr("href") || null;

        // Event logo from detail page
        const eventLogo =
          $('img[src*="node_event_site_logo"]').attr("src") ||
          $('img[data-src*="event_signup_logo"]').attr("data-src") ||
          raw.image;

        return {
          id: raw.link,
          brand: raw.brand,
          title: cleanEventTitle(raw.title),
          eventDate,
          link: raw.link,
          image: eventLogo,
          city: city || null,
          venue: venue || null,
          registrationUrl: regLink || null,
        } as BizzconEvent;
      } catch {
        return {
          id: raw.link,
          brand: raw.brand,
          title: cleanEventTitle(raw.title),
          eventDate: parseDateFromTitle(raw.title) || "",
          link: raw.link,
          image: raw.image,
          city: matchLocation(raw.title) || null,
          venue: null,
          registrationUrl: null,
        } as BizzconEvent;
      }
    },
  );

  // 4. Sort by date
  return detailedEvents
    .filter((e) => e.eventDate)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
}
