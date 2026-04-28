import type { DbAdapter, DbCollection } from "./adapter";
import { createSqliteAdapter } from "./sqlite";
import { createMongoAdapter } from "./mongodb";

let activePromise: Promise<DbAdapter> | null = null;

declare global {
  var _dbAdapterPromise: Promise<DbAdapter> | undefined;
}

async function initAdapter(): Promise<DbAdapter> {
  const forced = process.env.DB_BACKEND?.toLowerCase();

  if (forced === "mongodb") {
    return createMongoAdapter();
  }

  if (forced === "sqlite") {
    return createSqliteAdapter();
  }

  try {
    return createSqliteAdapter();
  } catch (sqliteErr) {
    console.warn("[db] SQLite init failed:", sqliteErr);
    if (process.env.MONGODB_URI && process.env.MONGODB_DB) {
      console.warn("[db] Falling back to MongoDB");
      return createMongoAdapter();
    }
    throw sqliteErr;
  }
}

export function getAdapter(): Promise<DbAdapter> {
  if (globalThis._dbAdapterPromise) return globalThis._dbAdapterPromise;
  if (activePromise) return activePromise;
  activePromise = initAdapter();
  globalThis._dbAdapterPromise = activePromise;
  return activePromise;
}

export async function getCollection<T = any>(name: string): Promise<DbCollection<T>> {
  const adapter = await getAdapter();
  return adapter.getCollection<T>(name);
}

export type { DbAdapter, DbCollection } from "./adapter";
