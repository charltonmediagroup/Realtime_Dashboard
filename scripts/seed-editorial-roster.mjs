// One-time seed: write the editorial roster (previously read from the
// MAD TEAM credentials sheet) into dashboard-config / editorial-roster.
// After this, the leaderboard reads from this DB doc instead of Sheets.
//
// Re-run any time you want to overwrite the roster.

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

const ROSTER = [
  { name: "Tessa Distor",                role: "Managing editor", username: "Tessa_Distor" },
  { name: "Frances Gagua",               role: "Managing editor", username: "Frances_Gagua" },
  { name: "Djan Magbanua",               role: "Managing editor", username: "Djan_Magbanua" },
  { name: "Noreen Jazul",                role: "Editor",          username: "Noreen_jazul" },
  { name: "Olivia Tirona",               role: "Editor",          username: "olivia@charltonmediamail.com" },
  { name: "Diana Dominguez",             role: "Editor",          username: "diana@charltonmediamail.com" },
  { name: "Joanne Ramos",                role: "Editor",          username: "joanne@charltonmediamail.com" },
  { name: "Sam Atok",                    role: "Editor",          username: "catdln95@gmail.com" },
  { name: "Vienna Verzo",                role: "Editor",          username: "vienna@charltonmediamail.com" },
  { name: "Terry Gangcuangco",           role: "Editor",          username: "terry.gangcuangco@yahoo.com" },
  { name: "Olive Pallasigue",            role: "Editor",          username: "liv@charltonmediamail.com" },
  { name: "Rain Zhao Runtong",           role: "Reporter",        username: "rainzhao.cmg@gmail.com" },
  { name: "Marielle Medina",             role: "Reporter",        username: "mayie@charltonmediamail.com" },
  { name: "Shiena Sur",                  role: "Editor",          username: "shiena@charltonmediamail.com" },
  { name: "Dylan Afuang",                role: "Editor",          username: "dylan@charltonmediamail.com" },
  { name: "Nicolas Van Levi Buenviaje",  role: "Reporter",        username: "levi@charltonmediamail.com" },
  { name: "Miguel Dumlao",               role: "Reporter",        username: "miguel@charltonmediamail.com" },
  { name: "Sam Bernardo",                role: "Reporter",        username: "samantha@charltonmediamail.com" },
  { name: "Clare Garaña",                role: "Reporter",        username: "clare@charltonmediamail.com" },
  { name: "Philippa Charlton",           role: "Managing editor", username: "philippa@charltonmediamail.com" },
  { name: "David Binning",               role: "Managing editor", username: "david@charltonmediamail.com" },
];

const { getCollection, getAdapter } = await import("../lib/db/index.ts");
const adapter = await getAdapter();
console.log("DB backend:", adapter.kind);

const col = await getCollection("dashboard-config");
await col.updateOne(
  { uid: "editorial-roster" },
  { $set: { data: ROSTER } },
  { upsert: true },
);
console.log(`Upserted editorial-roster with ${ROSTER.length} entries.`);

const back = await col.findOne({ uid: "editorial-roster" });
console.log("Verification — first 3 entries:");
for (const r of (back?.data ?? []).slice(0, 3)) console.log(" ", r);
console.log(`Total: ${back?.data?.length ?? 0}`);

await adapter.close();
