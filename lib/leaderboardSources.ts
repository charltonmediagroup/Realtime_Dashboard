// Single source of truth for the Google Sheets that feed the leaderboards.
// Imported by the API routes (so they read from these IDs) and by the admin
// References page (so users can see / open the source sheets).

export type SheetSource = {
  label: string;
  spreadsheetId: string;
  tabName?: string;
  gid?: number;
  range?: string;
  url: string;
};

const AWARDS_SHEET_ID = "1XaCvMWBcCgAsDByoWJE-ru3fv0K23U7rxI87_vFNWcE";
const AWARDS_TAB = "Awards Leaderboard";

const BIZZCON_SHEET_ID = "1QgONEKtOeeE12ts5maQlMfAlnee1qxi7O-E8zhtJjxY";
const BIZZCON_GID = 124466268;

export const AWARDS_LEADERBOARD_SHEET: SheetSource = {
  label: "Awards leaderboard",
  spreadsheetId: AWARDS_SHEET_ID,
  tabName: AWARDS_TAB,
  range: "!A1:E2000",
  url: `https://docs.google.com/spreadsheets/d/${AWARDS_SHEET_ID}/edit`,
};

export const BIZZCON_LEADERBOARD_SHEET: SheetSource = {
  label: "Bizzcon (sponsorship) leaderboard",
  spreadsheetId: BIZZCON_SHEET_ID,
  gid: BIZZCON_GID,
  url: `https://docs.google.com/spreadsheets/d/${BIZZCON_SHEET_ID}/edit#gid=${BIZZCON_GID}`,
};

export const LEADERBOARD_SHEETS: SheetSource[] = [
  AWARDS_LEADERBOARD_SHEET,
  BIZZCON_LEADERBOARD_SHEET,
];
