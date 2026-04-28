import type { Filter, Projection } from "./adapter";

type Primitive = string | number | boolean | null;
type OpValue = Primitive | Primitive[] | undefined;

const OPS: Record<string, string> = {
  $gt: ">",
  $lt: "<",
  $gte: ">=",
  $lte: "<=",
  $eq: "=",
};

const JSON_COL = "data";

function fieldExpr(key: string): { sql: string; isUid: boolean } {
  if (key === "uid") return { sql: "uid", isUid: true };
  const path = key.startsWith(`${JSON_COL}.`) ? key.slice(JSON_COL.length + 1) : key;
  return { sql: `json_extract(${JSON_COL}, '$.${path}')`, isUid: false };
}

function bindValue(v: unknown): Primitive {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string" || typeof v === "number") return v;
  return JSON.stringify(v);
}

function isOperatorObject(v: unknown): v is Record<string, OpValue> {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    Object.keys(v).every((k) => k.startsWith("$"))
  );
}

export interface TranslatedFilter {
  where: string;
  params: Primitive[];
}

export function translateFilter(filter: Filter): TranslatedFilter {
  const clauses: string[] = [];
  const params: Primitive[] = [];

  for (const [key, value] of Object.entries(filter)) {
    const { sql: expr, isUid } = fieldExpr(key);

    if (isOperatorObject(value)) {
      for (const [op, raw] of Object.entries(value)) {
        if (op === "$exists") {
          clauses.push(raw ? `${expr} IS NOT NULL` : `${expr} IS NULL`);
        } else if (op === "$ne") {
          clauses.push(`(${expr} IS NULL OR ${expr} != ?)`);
          params.push(bindValue(raw));
        } else if (op in OPS) {
          clauses.push(`${expr} ${OPS[op]} ?`);
          params.push(bindValue(raw));
        } else if (op === "$in" && Array.isArray(raw) && raw.length > 0) {
          const placeholders = raw.map(() => "?").join(",");
          clauses.push(`${expr} IN (${placeholders})`);
          for (const item of raw) params.push(bindValue(item));
        } else {
          throw new Error(`[filterTranslator] Unsupported operator: ${op}`);
        }
      }
    } else if (value === null) {
      clauses.push(`${expr} IS NULL`);
    } else if (isUid) {
      clauses.push(`${expr} = ?`);
      params.push(bindValue(value));
    } else {
      clauses.push(`${expr} = ?`);
      params.push(bindValue(value));
    }
  }

  return {
    where: clauses.length ? clauses.join(" AND ") : "1=1",
    params,
  };
}

export function translateSort(sort: Record<string, 1 | -1>): string {
  const parts: string[] = [];
  for (const [key, dir] of Object.entries(sort)) {
    const { sql } = fieldExpr(key);
    parts.push(`${sql} ${dir === -1 ? "DESC" : "ASC"}`);
  }
  return parts.length ? `ORDER BY ${parts.join(", ")}` : "";
}

/**
 * Apply a Mongo-style projection to a parsed document in JS.
 * Only inclusion projections are supported (Mongo's common case).
 * Supports dot-path keys like `data.brand_x` — the `data.` prefix
 * selects a sub-field of the stored data object.
 */
export function applyProjection<T extends { uid: string; data?: unknown }>(
  doc: T,
  projection: Projection | undefined,
): T {
  if (!projection) return doc;
  const includes = Object.entries(projection).filter(([, v]) => v === 1);
  if (includes.length === 0) return doc;

  const dataPaths = includes
    .map(([k]) => k)
    .filter((k) => k !== "uid" && k !== "_id")
    .map((k) => (k.startsWith("data.") ? k.slice(5) : k));

  if (dataPaths.length === 0) return doc;

  const src = (doc.data ?? {}) as Record<string, unknown>;
  const projected: Record<string, unknown> = {};
  for (const p of dataPaths) {
    const segments = p.split(".");
    let cur: unknown = src;
    for (const seg of segments) {
      if (cur && typeof cur === "object" && seg in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[seg];
      } else {
        cur = undefined;
        break;
      }
    }
    if (cur !== undefined) {
      let target = projected;
      for (let i = 0; i < segments.length - 1; i++) {
        const seg = segments[i];
        if (!target[seg] || typeof target[seg] !== "object") target[seg] = {};
        target = target[seg] as Record<string, unknown>;
      }
      target[segments[segments.length - 1]] = cur;
    }
  }

  return { ...doc, data: projected } as T;
}
