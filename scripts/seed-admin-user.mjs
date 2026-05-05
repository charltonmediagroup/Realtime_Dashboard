// Seed or update an admin user.
// Usage: npx tsx scripts/seed-admin-user.mjs <username> <password>
//
// Creates the user if it doesn't exist, otherwise updates the password.

import { readFileSync, existsSync } from "fs";
import { join } from "path";

function loadEnv() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();

const [, , username, password] = process.argv;
if (!username || !password) {
  console.error("Usage: npx tsx scripts/seed-admin-user.mjs <username> <password>");
  process.exit(1);
}
if (password.length < 6) {
  console.error("Password must be at least 6 characters.");
  process.exit(1);
}

const { getAdapter } = await import("../lib/db/index.ts");
const { findByUsername, createUser, updatePassword } = await import("../lib/adminUsers.ts");

const adapter = await getAdapter();
console.log("DB backend:", adapter.kind);

const existing = await findByUsername(username);
if (existing) {
  await updatePassword(username, password);
  console.log(`Updated password for admin user "${username}".`);
} else {
  await createUser(username, password);
  console.log(`Created admin user "${username}".`);
}

await adapter.close();
