// lib/mongodb.ts
import { MongoClient, Db, Collection, Document } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!uri) throw new Error("Please define MONGODB_URI in .env");
if (!dbName) throw new Error("Please define MONGODB_DB in .env");

// Extend global type (recommended)
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const clientPromise: Promise<MongoClient> =
  globalThis._mongoClientPromise ??
  (globalThis._mongoClientPromise = new MongoClient(uri).connect());

// Helper: get collection typed
export async function getCollection<T extends Document = Document>(
  collectionName: string,
): Promise<Collection<T>> {
  if (!collectionName) throw new Error("Collection name is required");

  const client = await clientPromise;
  const db: Db = client.db(dbName);
  return db.collection<T>(collectionName);
}
