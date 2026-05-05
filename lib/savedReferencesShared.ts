// Client-safe types, constants, and pure helpers for saved references.
// Do NOT import any server-only modules (db, googleapis, fs) from this file —
// it is bundled into client components.

export type ReferenceTemplate = "dark" | "light";

export type ReferenceColumn = {
  source: string;
  label: string;
  visible: boolean;
};

export const PUBLISH_PARENTS = ["", "editorial", "awards", "bizzcon"] as const;
export type PublishParent = (typeof PUBLISH_PARENTS)[number];

export const PUBLISH_PARENT_LABEL: Record<PublishParent, string> = {
  "": "Root /dashboard",
  editorial: "Editorial",
  awards: "Awards",
  bizzcon: "Bizzcon",
};

export type SavedReference = {
  id: string;
  title: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  tabName: string;
  columns: ReferenceColumn[];
  template: ReferenceTemplate;
  primaryColor: string;
  rowsPerPage: number;
  published: boolean;
  publishParent: PublishParent;
  publishSlug: string;
  createdAt: number;
  updatedAt: number;
};

export const TEMPLATES: ReferenceTemplate[] = ["light", "dark"];

export const DEFAULT_PRIMARY_COLOR = "#1d4ed8";

export function extractSpreadsheetId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const m = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "ref"
  );
}

export function makeUniqueId(title: string, existing: string[]): string {
  const base = slugify(title);
  if (!existing.includes(base)) return base;
  let i = 2;
  while (existing.includes(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

export function isHexColor(s: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s);
}

export function normalizeReference(ref: Partial<SavedReference>): SavedReference {
  // Backwards compat: prior versions had a "color" template — that role is
  // now always-on (theme color is a separate setting). Migrate to "light".
  const rawTemplate = ref.template as string | undefined;
  const template: ReferenceTemplate =
    rawTemplate === "dark"
      ? "dark"
      : rawTemplate === "light" || rawTemplate === "color" || !rawTemplate
        ? "light"
        : "light";
  const rowsPerPage = Math.max(
    1,
    Math.min(500, Math.floor(Number(ref.rowsPerPage) || 25)),
  );
  const columns = Array.isArray(ref.columns) ? ref.columns : [];
  const primaryColor =
    typeof ref.primaryColor === "string" && isHexColor(ref.primaryColor)
      ? ref.primaryColor
      : DEFAULT_PRIMARY_COLOR;
  const publishParent = (PUBLISH_PARENTS as readonly string[]).includes(
    String(ref.publishParent ?? ""),
  )
    ? (ref.publishParent as PublishParent)
    : "";
  return {
    id: String(ref.id ?? ""),
    title: String(ref.title ?? "").trim(),
    spreadsheetId: String(ref.spreadsheetId ?? ""),
    spreadsheetUrl: String(ref.spreadsheetUrl ?? ""),
    tabName: String(ref.tabName ?? ""),
    columns: columns
      .map((c) => ({
        source: String((c as ReferenceColumn)?.source ?? ""),
        label: String((c as ReferenceColumn)?.label ?? ""),
        visible: Boolean((c as ReferenceColumn)?.visible),
      }))
      .filter((c) => c.source),
    template,
    primaryColor,
    rowsPerPage,
    published: Boolean(ref.published),
    publishParent,
    publishSlug: slugify(String(ref.publishSlug ?? ref.id ?? "")),
    createdAt: Number(ref.createdAt) || Date.now(),
    updatedAt: Number(ref.updatedAt) || Date.now(),
  };
}
