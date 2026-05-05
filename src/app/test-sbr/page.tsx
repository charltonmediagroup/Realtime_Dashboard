// Temporary test page — cross-brand journalist leaderboard by GA4 pageviews.
// Joins Drupal JSON:API (article → author) with GA4 screenPageViews for each brand.
// Delete when no longer needed.

import { BetaAnalyticsDataClient } from "@google-analytics/data";
import BRAND_PROPERTIES_RAW from "@/data/brand_properties.json";
import GA4_PROPERTIES_RAW from "@/data/brand_ga4_properties.json";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ARTICLE_LIMIT = 30;
const DAYS_BACK = 30;

// brand slug → Drupal domain (where /jsonapi/node/article is reachable)
const BRAND_DOMAINS: Record<string, string> = {
  sbr: "sbr.com.sg",
  hkb: "hongkongbusiness.hk",
  abf: "asianbankingandfinance.net",
  abr: "asianbusinessreview.com",
  ia: "insuranceasia.com",
  ra: "retailasia.com",
  ap: "asian-power.com",
  hca: "healthcareasiamagazine.com",
  qsr: "qsrmedia.com",
  "qsr-asia": "qsrmedia.asia",
  "qsr-aus": "qsrmedia.com.au",
  "qsr-uk": "qsrmedia.co.uk",
  esgb: "esgbusiness.com",
  gm: "govmedia.asia",
  invest: "investmentasia.net",
  mir: "marineindustrial.com",
  rea: "realestateasia.com",
};

const BRAND_PROPERTIES = BRAND_PROPERTIES_RAW as Record<string, { name: string }>;
const GA4_PROPS = GA4_PROPERTIES_RAW as Record<string, string>;

// ---------- JSON:API ----------
type Relationship = { data?: { type: string; id: string } | { type: string; id: string }[] | null };
type Article = {
  id: string;
  attributes: {
    drupal_internal__nid: number;
    title: string;
    created: string;
    path?: { alias?: string | null } | null;
  };
  relationships: Record<string, Relationship>;
};
type Included = { type: string; id: string; attributes: Record<string, unknown> };
type JsonApiResponse = { data: Article[]; included?: Included[] };

function firstRelId(rel: Relationship | undefined): string | undefined {
  const d = rel?.data;
  if (!d) return undefined;
  return Array.isArray(d) ? d[0]?.id : d.id;
}
function lookup(included: Included[] | undefined, type: string, id: string): Included | undefined {
  return included?.find((i) => i.type === type && i.id === id);
}

async function fetchArticles(domain: string): Promise<JsonApiResponse | null> {
  const params = new URLSearchParams({
    "page[limit]": String(ARTICLE_LIMIT),
    sort: "-created",
    "filter[status]": "1",
    include: "uid",
    "fields[node--article]": "title,created,path,uid,drupal_internal__nid",
    "fields[user--user]": "display_name",
  });
  const url = `https://${domain}/jsonapi/node/article?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/vnd.api+json",
        Referer: `https://${domain}/`,
      },
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return (await res.json()) as JsonApiResponse;
  } catch {
    return null;
  }
}

// ---------- GA4 ----------
async function fetchPageViews(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  paths: string[],
): Promise<Map<string, number>> {
  if (paths.length === 0) return new Map();

  const [resp] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: `${DAYS_BACK}daysAgo`, endDate: "today" }],
    dimensions: [{ name: "pagePath" }],
    metrics: [{ name: "screenPageViews" }],
    dimensionFilter: {
      filter: {
        fieldName: "pagePath",
        inListFilter: { values: paths, caseSensitive: false },
      },
    },
    limit: 1000,
  });

  const out = new Map<string, number>();
  for (const row of resp.rows ?? []) {
    const path = row.dimensionValues?.[0]?.value ?? "";
    const views = Number(row.metricValues?.[0]?.value ?? 0);
    const key = path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path;
    out.set(key, (out.get(key) ?? 0) + views);
  }
  return out;
}

// ---------- Aggregation ----------
type ArticleRow = {
  brand: string;
  brandName: string;
  domain: string;
  nid: number;
  title: string;
  alias: string;
  created: string;
  authorKey: string; // unique per brand user
  authorName: string;
  views: number;
};

type AuthorRow = {
  authorName: string;
  brands: Set<string>;
  articles: ArticleRow[];
  totalViews: number;
};

async function loadBrand(
  client: BetaAnalyticsDataClient,
  brand: string,
): Promise<{ brand: string; rows: ArticleRow[]; error?: string; matched: number }> {
  const domain = BRAND_DOMAINS[brand];
  const propertyId = GA4_PROPS[brand];
  const brandName = BRAND_PROPERTIES[brand]?.name ?? brand;
  if (!domain) return { brand, rows: [], error: "no domain mapped", matched: 0 };
  if (!propertyId) return { brand, rows: [], error: "no GA4 property", matched: 0 };

  const payload = await fetchArticles(domain);
  if (!payload) return { brand, rows: [], error: "JSON:API fetch failed", matched: 0 };

  const articleMeta = payload.data.map((a) => {
    const alias = a.attributes.path?.alias ?? "";
    const authorId = firstRelId(a.relationships.uid);
    const user = authorId ? lookup(payload.included, "user--user", authorId) : undefined;
    const authorName = (user?.attributes.display_name as string) || "Unknown";
    return {
      nid: a.attributes.drupal_internal__nid,
      title: a.attributes.title,
      alias,
      created: a.attributes.created,
      authorKey: `${brand}:${authorId ?? authorName}`,
      authorName,
    };
  });

  const paths = articleMeta.map((m) => m.alias).filter(Boolean);
  let viewsByPath = new Map<string, number>();
  try {
    viewsByPath = await fetchPageViews(client, propertyId, paths);
  } catch (e) {
    return {
      brand,
      rows: [],
      error: `GA4: ${e instanceof Error ? e.message : String(e)}`,
      matched: 0,
    };
  }

  const rows: ArticleRow[] = articleMeta.map((m) => ({
    brand,
    brandName,
    domain,
    nid: m.nid,
    title: m.title,
    alias: m.alias,
    created: m.created,
    authorKey: m.authorKey,
    authorName: m.authorName,
    views: viewsByPath.get(m.alias) ?? 0,
  }));
  return { brand, rows, matched: viewsByPath.size };
}

// ---------- Page ----------
export default async function LeaderboardPage() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    return (
      <main style={mainStyle}>
        <h1>Leaderboard</h1>
        <div style={errorBox}>GOOGLE_SERVICE_ACCOUNT_JSON env var not set.</div>
      </main>
    );
  }
  const client = new BetaAnalyticsDataClient({ credentials: JSON.parse(raw) });

  const brands = Object.keys(BRAND_DOMAINS);
  const brandResults = await Promise.all(brands.map((b) => loadBrand(client, b)));

  const allRows = brandResults.flatMap((r) => r.rows);
  const errors = brandResults.filter((r) => r.error).map((r) => ({ brand: r.brand, error: r.error! }));

  // Aggregate by author name (across brands, since a person writes under same display_name)
  const authorMap = new Map<string, AuthorRow>();
  for (const row of allRows) {
    const key = row.authorName.toLowerCase();
    const g = authorMap.get(key) ?? {
      authorName: row.authorName,
      brands: new Set<string>(),
      articles: [],
      totalViews: 0,
    };
    g.brands.add(row.brand);
    g.articles.push(row);
    g.totalViews += row.views;
    authorMap.set(key, g);
  }
  const authors = Array.from(authorMap.values()).sort((a, b) => b.totalViews - a.totalViews);
  for (const a of authors) a.articles.sort((x, y) => y.views - x.views);

  return (
    <main style={mainStyle}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>Details by Journalist</h1>
      <p style={{ color: "#666", marginTop: 0, fontSize: "0.875rem" }}>
        Last {ARTICLE_LIMIT} articles per brand · GA4 <code>screenPageViews</code>, last {DAYS_BACK} days.
      </p>

      {errors.length > 0 && (
        <details style={{ margin: "1rem 0" }}>
          <summary style={{ cursor: "pointer", color: "#a33" }}>
            {errors.length} brand(s) with errors
          </summary>
          <ul style={{ fontSize: "0.8rem" }}>
            {errors.map((e) => (
              <li key={e.brand}>
                <code>{e.brand}</code>: {e.error}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "1.25rem" }}>
        {authors.map((a, i) => (
          <section key={a.authorName} style={{ border: "1px solid #e5e5e5", borderRadius: 8, overflow: "hidden" }}>
            <header
              style={{
                background: "#0b5cad",
                color: "#fff",
                padding: "0.6rem 1rem",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <strong>
                #{i + 1} {a.authorName}
              </strong>
              <span style={{ fontSize: "0.85rem", opacity: 0.9 }}>
                {a.totalViews.toLocaleString()} views · {a.articles.length} articles ·{" "}
                {Array.from(a.brands).sort().join(", ").toUpperCase()}
              </span>
            </header>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <tbody>
                {a.articles.map((art) => (
                  <tr key={`${art.brand}-${art.nid}`} style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ padding: "0.45rem 1rem", width: "8%" }}>
                      <span
                        style={{
                          background: "#e8eef5",
                          color: "#0b5cad",
                          padding: "2px 8px",
                          borderRadius: 3,
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          textTransform: "uppercase",
                        }}
                      >
                        {art.brand}
                      </span>
                    </td>
                    <td style={{ padding: "0.45rem 1rem", width: "67%" }}>
                      <a
                        href={`https://${art.domain}${art.alias}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#0b5cad", textDecoration: "none" }}
                      >
                        {art.title}
                      </a>
                      <div style={{ color: "#888", fontSize: "0.72rem" }}>
                        {new Date(art.created).toLocaleDateString()} · NID {art.nid}
                      </div>
                    </td>
                    <td style={{ padding: "0.45rem 1rem", textAlign: "right", fontWeight: 600, width: "15%" }}>
                      {art.views.toLocaleString()}
                    </td>
                    <td style={{ padding: "0.45rem 1rem", color: "#888", fontSize: "0.72rem", width: "10%" }}>
                      {art.views === 0 ? "no GA4 match" : "views"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </main>
  );
}

const mainStyle: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "2rem 1rem",
  fontFamily: "system-ui, sans-serif",
  color: "#111",
  background: "#fff",
};
const errorBox: React.CSSProperties = {
  background: "#fee",
  border: "1px solid #fcc",
  padding: "0.75rem 1rem",
  borderRadius: 6,
  marginTop: "1rem",
};
