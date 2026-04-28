import Database, { Database as DbType } from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type {
  DbAdapter,
  DbCollection,
  DbCursor,
  Filter,
  FindOptions,
  Projection,
  SortSpec,
  UpdateOptions,
} from "./adapter";
import { applyProjection, translateFilter, translateSort } from "./filterTranslator";

interface Row {
  uid: string;
  data: string;
}

function rowToDoc<T>(row: Row, projection?: Projection): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.data);
  } catch {
    parsed = null;
  }
  const doc = { uid: row.uid, data: parsed } as { uid: string; data: unknown };
  return applyProjection(doc, projection) as T;
}

class SqliteCursor<T> implements DbCursor<T> {
  private sortSpec: SortSpec | null = null;
  private skipN = 0;
  private limitN: number | null = null;
  private projection: Projection | null = null;

  constructor(
    private db: DbType,
    private collection: string,
    private filter: Filter,
  ) {}

  sort(spec: SortSpec) {
    this.sortSpec = spec;
    return this;
  }
  skip(n: number) {
    this.skipN = n;
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  project(spec: Projection) {
    this.projection = spec;
    return this;
  }

  async toArray(): Promise<T[]> {
    const { where, params } = translateFilter(this.filter);
    const orderBy = this.sortSpec ? translateSort(this.sortSpec) : "";
    const limitClause = this.limitN != null ? `LIMIT ${this.limitN | 0}` : "";
    const offsetClause = this.skipN > 0 ? `OFFSET ${this.skipN | 0}` : "";

    const sql = `SELECT uid, data FROM kv_store WHERE collection = ? AND (${where}) ${orderBy} ${limitClause} ${offsetClause}`.trim();
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(this.collection, ...params) as Row[];
    return rows.map((r) => rowToDoc<T>(r, this.projection ?? undefined));
  }
}

class SqliteCollection<T = any> implements DbCollection<T> {
  constructor(
    private db: DbType,
    private name: string,
  ) {}

  async findOne<R = T>(filter: Filter, options?: FindOptions): Promise<R | null> {
    const { where, params } = translateFilter(filter);
    const sql = `SELECT uid, data FROM kv_store WHERE collection = ? AND (${where}) LIMIT 1`;
    const stmt = this.db.prepare(sql);
    const row = stmt.get(this.name, ...params) as Row | undefined;
    return row ? rowToDoc<R>(row, options?.projection) : null;
  }

  find<R = T>(filter: Filter): DbCursor<R> {
    return new SqliteCursor<R>(this.db, this.name, filter);
  }

  async updateOne(
    filter: Filter,
    update: { $set: Record<string, unknown> },
    options?: UpdateOptions,
  ): Promise<void> {
    const uidFromFilter =
      typeof filter.uid === "string" ? filter.uid : undefined;
    const uidFromSet =
      typeof update.$set?.uid === "string"
        ? (update.$set.uid as string)
        : undefined;
    const uid = uidFromFilter ?? uidFromSet;

    if (!uid) {
      throw new Error(
        "[sqlite] updateOne requires a uid in filter or $set (non-uid filters not supported)",
      );
    }

    const setCopy = { ...update.$set };
    delete setCopy.uid;
    const data =
      "data" in setCopy && Object.keys(setCopy).length === 1
        ? setCopy.data
        : setCopy;
    const dataJson = JSON.stringify(data ?? null);

    if (options?.upsert) {
      const stmt = this.db.prepare(
        `INSERT INTO kv_store (collection, uid, data)
         VALUES (?, ?, ?)
         ON CONFLICT(collection, uid) DO UPDATE SET data = excluded.data`,
      );
      stmt.run(this.name, uid, dataJson);
    } else {
      const stmt = this.db.prepare(
        `UPDATE kv_store SET data = ? WHERE collection = ? AND uid = ?`,
      );
      stmt.run(dataJson, this.name, uid);
    }
  }
}

export class SqliteAdapter implements DbAdapter {
  readonly kind = "sqlite" as const;
  private db: DbType;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kv_store (
        collection TEXT NOT NULL,
        uid        TEXT NOT NULL,
        data       TEXT NOT NULL,
        PRIMARY KEY (collection, uid)
      );
      CREATE INDEX IF NOT EXISTS idx_kv_collection ON kv_store(collection);
    `);
  }

  getCollection<T = unknown>(name: string): DbCollection<T> {
    return new SqliteCollection<T>(this.db, name);
  }

  async close() {
    this.db.close();
  }
}

export function defaultSqlitePath(): string {
  const dir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
  return path.join(dir, "app.db");
}

export function createSqliteAdapter(dbPath: string = defaultSqlitePath()): SqliteAdapter {
  return new SqliteAdapter(dbPath);
}
