// Shared between the server page (page.tsx) and the client component
// (EditorialLeaderboard.tsx). Keep this file free of "use client" so the
// server can import the actual array, not a client-reference proxy.

export type RangeKey = "7d" | "30d" | "week" | "month";

export const RANGE_OPTIONS: ReadonlyArray<{ value: RangeKey; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

// Article-type filter. The empty value means "any section". Each non-empty
// value matches the URL path segment Drupal uses for that content type
// (e.g. /lending-credit/commentary/foo or /commentary/bar both match "commentary").
export const SECTION_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "All sections" },
  { value: "news", label: "News" },
  { value: "commentary", label: "Commentary" },
  { value: "in-focus", label: "In Focus" },
  { value: "exclusive", label: "Exclusive" },
  { value: "expert-opinion", label: "Expert Opinion" },
  { value: "feature", label: "Feature" },
  { value: "event-news", label: "Event News" },
  { value: "press-releases", label: "Press Releases" },
];

// Match an article path against a section slug.
// Slug "commentary" matches "/commentary/...", "/foo/commentary/bar",
// and trailing "/commentary" (article = the section landing). Empty slug = wildcard.
export function pathMatchesSection(path: string, slug: string): boolean {
  if (!slug) return true;
  const needle = "/" + slug.toLowerCase();
  const lower = path.toLowerCase();
  return lower === needle || lower.startsWith(needle + "/") || lower.includes(needle + "/");
}
