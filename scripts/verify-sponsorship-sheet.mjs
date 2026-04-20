import { google } from "googleapis";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHEET_ID = "1QgONEKtOeeE12ts5maQlMfAlnee1qxi7O-E8zhtJjxY";
const SHEET_GID = 124466268;

const envPath = join(__dirname, "..", ".env.local");
const envText = readFileSync(envPath, "utf8");
const getVar = (k) => envText.match(new RegExp(`^${k}=(.+)$`, "m"))?.[1]?.trim();
const clientId = getVar("GOOGLE_OAUTH_CLIENT_ID");
const clientSecret = getVar("GOOGLE_OAUTH_CLIENT_SECRET");
const refreshToken = getVar("GOOGLE_OAUTH_REFRESH_TOKEN");

const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
oauth2.setCredentials({ refresh_token: refreshToken });
const sheets = google.sheets({ version: "v4", auth: oauth2 });

function parseCurrency(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const cleaned = s.replace(/[$,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : s.toUpperCase();
}

const fmt = (n) => `$${Math.round(n).toLocaleString("en-US")}`;

const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID, fields: "sheets(properties(sheetId,title,gridProperties))" });
const tab = meta.data.sheets.find((s) => s.properties.sheetId === SHEET_GID);
console.log(`Tab: "${tab.properties.title}" | rows=${tab.properties.gridProperties.rowCount} cols=${tab.properties.gridProperties.columnCount}`);

// Read a wide range to catch anything beyond A1:J21
const wideRange = `'${tab.properties.title.replace(/'/g, "''")}'!A1:Z60`;
const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: wideRange,
  valueRenderOption: "UNFORMATTED_VALUE",
});

const rows = res.data.values ?? [];
console.log(`Rows returned: ${rows.length}\n`);

console.log("=== RAW ROWS ===");
rows.forEach((r, i) => {
  console.log(`R${i + 1}: [${r.map((c) => JSON.stringify(c)).join(", ")}]`);
});

const header = rows[0].map((c) => String(c ?? "").trim());
const totalIdx = header.findIndex((h) => h.toUpperCase() === "TOTAL");
const monthlyIdx = header.findIndex((h) => h.toUpperCase().includes("MONTHLY"));
const salespeople = header.slice(1, totalIdx === -1 ? header.length : totalIdx).filter(Boolean);

console.log(`\n=== PARSED HEADER ===`);
console.log(`Header: ${JSON.stringify(header)}`);
console.log(`Salespeople: ${JSON.stringify(salespeople)}`);
console.log(`Weekly Total col idx: ${totalIdx}`);
console.log(`Monthly Total col idx: ${monthlyIdx}\n`);

const totals = Object.fromEntries(salespeople.map((n) => [n, 0]));
let weeklySumFromSheet = 0;
let monthlySumFromSheet = 0;
let weeklySumComputed = 0;
const issues = [];

console.log("=== ROW-BY-ROW CHECK ===");
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const week = String(row[0] ?? "").trim();
  if (!week) continue;

  let computedRowTotal = 0;
  const perPerson = {};
  salespeople.forEach((name, idx) => {
    const cell = parseCurrency(row[1 + idx]);
    perPerson[name] = cell;
    if (typeof cell === "number") {
      computedRowTotal += cell;
      totals[name] += cell;
    }
  });

  const sheetWeekly = totalIdx >= 0 ? parseCurrency(row[totalIdx]) : null;
  const sheetMonthly = monthlyIdx >= 0 ? parseCurrency(row[monthlyIdx]) : null;
  const sheetWeeklyNum = typeof sheetWeekly === "number" ? sheetWeekly : 0;
  const sheetMonthlyNum = typeof sheetMonthly === "number" ? sheetMonthly : 0;

  weeklySumComputed += computedRowTotal;
  weeklySumFromSheet += sheetWeeklyNum;
  monthlySumFromSheet += sheetMonthlyNum;

  const delta = +(computedRowTotal - sheetWeeklyNum).toFixed(2);
  const flag = Math.abs(delta) > 0.01 ? `  ⚠ delta=${fmt(delta)}` : "";
  console.log(
    `${week.padEnd(22)} | computed=${fmt(computedRowTotal).padStart(10)} | sheet=${fmt(sheetWeeklyNum).padStart(10)}${sheetMonthlyNum ? ` | monthly=${fmt(sheetMonthlyNum)}` : ""}${flag}`,
  );
  if (Math.abs(delta) > 0.01) issues.push({ row: i + 1, week, delta, perPerson, sheetWeekly });
}

console.log("\n=== PER-PERSON TOTALS (ranked) ===");
Object.entries(totals)
  .sort((a, b) => b[1] - a[1])
  .forEach(([name, t], i) => console.log(`#${i + 1}  ${name.padEnd(10)} ${fmt(t)}`));

const grand = Object.values(totals).reduce((a, b) => a + b, 0);
console.log(`\nComputed grand total (sum of per-person): ${fmt(grand)}`);
console.log(`Sum of sheet's Weekly column        : ${fmt(weeklySumFromSheet)}`);
console.log(`Sum of sheet's Monthly column       : ${fmt(monthlySumFromSheet)}`);

// Try to find a grand total cell explicitly in the sheet (often in J22+)
console.log("\n=== SCAN FOR EXPLICIT GRAND TOTAL CELL ===");
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  for (let j = 0; j < row.length; j++) {
    const v = parseCurrency(row[j]);
    if (typeof v === "number" && v > 100000) {
      console.log(`  R${i + 1}C${j + 1} (${String.fromCharCode(65 + j)}${i + 1}): ${fmt(v)}`);
    }
  }
}

if (issues.length) {
  console.log("\n=== ISSUES ===");
  issues.forEach((x) => console.log(`Row ${x.row} (${x.week}): delta ${fmt(x.delta)} | perPerson=${JSON.stringify(x.perPerson)} sheetWeekly=${x.sheetWeekly}`));
} else {
  console.log("\n✓ All weekly computed totals match sheet's Weekly Total column.");
}
