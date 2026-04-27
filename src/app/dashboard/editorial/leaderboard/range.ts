// Shared between the server page (page.tsx) and the client component
// (EditorialLeaderboard.tsx). Keep this file free of "use client" so the
// server can import the actual array, not a client-reference proxy.

export type RangeKey = "7d" | "30d" | "week" | "month";

export const RANGE_OPTIONS: ReadonlyArray<{ value: RangeKey; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];
