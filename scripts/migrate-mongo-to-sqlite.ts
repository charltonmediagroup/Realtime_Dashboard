/**
 * One-time migration: read every document from MongoDB and write it into
 * the local SQLite datastore.
 *
 * Usage (Node 20.6+ --env-file flag reads .env.local):
 *   npx tsx --env-file=.env.local scripts/migrate-mongo-to-sqlite.ts
 *
 * Or with env vars inline:
 *   MONGODB_URI="..." MONGODB_DB="cmg_db" DATA_DIR=./data \
 *     npx tsx scripts/migrate-mongo-to-sqlite.ts
 *
 * Idempotent: re-running overwrites existing rows via upsert.
 */
import { MongoClient } from "mongodb";
import { createSqliteAdapter, defaultSqlitePath } from "../lib/db/sqlite";

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;
  if (!uri || !dbName) {
    console.error("MONGODB_URI and MONGODB_DB must be set in the environment.");
    process.exit(1);
  }

  const sqlitePath = defaultSqlitePath();
  console.log(`[migrate] SQLite target: ${sqlitePath}`);
  console.log(`[migrate] Mongo source:  ${dbName}`);

  const sqlite = createSqliteAdapter(sqlitePath);
  const mongo = await new MongoClient(uri).connect();
  const mongoDb = mongo.db(dbName);

  try {
    const collections = await mongoDb.listCollections().toArray();
    console.log(`[migrate] Found ${collections.length} collection(s).`);

    let total = 0;
    for (const { name } of collections) {
      const mongoCol = mongoDb.collection(name);
      const sqliteCol = sqlite.getCollection(name);

      const cursor = mongoCol.find({});
      let count = 0;
      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        if (!doc) continue;
        const uid =
          typeof doc.uid === "string" ? doc.uid : String(doc._id ?? "");
        if (!uid) {
          console.warn(`[migrate] Skipping doc without uid in ${name}`);
          continue;
        }
        const { _id, uid: _u, ...rest } = doc as Record<string, unknown>;
        const payload =
          "data" in rest && Object.keys(rest).length === 1
            ? rest.data
            : rest;
        await sqliteCol.updateOne(
          { uid },
          { $set: { uid, data: payload } },
          { upsert: true },
        );
        count++;
      }
      console.log(`[migrate]   ${name}: ${count} document(s)`);
      total += count;
    }

    console.log(`[migrate] Done. ${total} document(s) migrated.`);
  } finally {
    await mongo.close();
    await sqlite.close();
  }
}

main().catch((err) => {
  console.error("[migrate] Failed:", err);
  process.exit(1);
});
