import bcrypt from "bcryptjs";
import { getCollection } from "@/lib/db";

const COLLECTION = "admin-users";
const SALT_ROUNDS = 10;

export type AdminUser = {
  username: string;
  passwordHash: string;
  createdAt: number;
  lastLoginAt?: number;
};

export type AdminUserPublic = Omit<AdminUser, "passwordHash">;

function publicView(u: AdminUser): AdminUserPublic {
  return {
    username: u.username,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  };
}

export async function findByUsername(username: string): Promise<AdminUser | null> {
  const col = await getCollection<AdminUser>(COLLECTION);
  return col.findOne({ username });
}

export async function verifyPassword(user: AdminUser, plain: string): Promise<boolean> {
  if (!user?.passwordHash) return false;
  return bcrypt.compare(plain, user.passwordHash);
}

export async function createUser(username: string, plain: string): Promise<void> {
  const u = username.trim();
  if (!u) throw new Error("Username required");
  if (!plain || plain.length < 6) throw new Error("Password must be at least 6 characters");
  const existing = await findByUsername(u);
  if (existing) throw new Error("User already exists");
  const passwordHash = await bcrypt.hash(plain, SALT_ROUNDS);
  const col = await getCollection<AdminUser>(COLLECTION);
  await col.insertOne({ username: u, passwordHash, createdAt: Date.now() });
}

export async function updatePassword(username: string, plain: string): Promise<void> {
  if (!plain || plain.length < 6) throw new Error("Password must be at least 6 characters");
  const passwordHash = await bcrypt.hash(plain, SALT_ROUNDS);
  const col = await getCollection<AdminUser>(COLLECTION);
  await col.updateOne({ username }, { $set: { passwordHash } });
}

export async function deleteUser(username: string): Promise<{ deletedCount: number }> {
  const col = await getCollection<AdminUser>(COLLECTION);
  return col.deleteOne({ username });
}

export async function listUsers(): Promise<AdminUserPublic[]> {
  const col = await getCollection<AdminUser>(COLLECTION);
  const rows = await col.find({}).toArray();
  return rows.map(publicView).sort((a, b) => a.username.localeCompare(b.username));
}

export async function countUsers(): Promise<number> {
  const col = await getCollection<AdminUser>(COLLECTION);
  const rows = await col.find({}).toArray();
  return rows.length;
}

export async function touchLastLogin(username: string): Promise<void> {
  const col = await getCollection<AdminUser>(COLLECTION);
  await col.updateOne({ username }, { $set: { lastLoginAt: Date.now() } });
}
