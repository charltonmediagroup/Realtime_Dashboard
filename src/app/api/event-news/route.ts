import { NextRequest, NextResponse } from "next/server";

export const revalidate = 600;

const TITLE_RE = /<h2\s+class="item__title\s+size-(?:24|26)"[^>]*>([\s\S]*?)<\/h2>/gi;

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extractTitles(html: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of html.matchAll(TITLE_RE)) {
    const inner = m[1]
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!inner) continue;
    const decoded = decodeEntities(inner);
    const key = decoded.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(decoded);
  }
  return out;
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "invalid protocol" }, { status: 400 });
  }

  const eventNewsUrl = `${parsed.origin}/event-news`;

  try {
    const res = await fetch(eventNewsUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CMG-Dashboard-Ticker/1.0; +https://charltonmediamail.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: 600 },
    });

    if (!res.ok) {
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${escapeXml(parsed.hostname)} event news</title></channel></rss>`,
        {
          status: 200,
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=300, s-maxage=600",
            "X-Event-News-Status": String(res.status),
          },
        },
      );
    }

    const html = await res.text();
    const titles = extractTitles(html);

    const items = titles
      .map(
        (t) =>
          `    <item><title>${escapeXml(t)}</title><link>${escapeXml(eventNewsUrl)}</link></item>`,
      )
      .join("\n");

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<rss version="2.0"><channel>\n` +
      `    <title>${escapeXml(parsed.hostname)} event news</title>\n` +
      `    <link>${escapeXml(eventNewsUrl)}</link>\n` +
      `${items}\n` +
      `</channel></rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=600",
      },
    });
  } catch (err) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${escapeXml(parsed.hostname)} event news</title></channel></rss>`,
      {
        status: 200,
        headers: {
          "Content-Type": "application/rss+xml; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Event-News-Error": (err as Error).message.slice(0, 120),
        },
      },
    );
  }
}
