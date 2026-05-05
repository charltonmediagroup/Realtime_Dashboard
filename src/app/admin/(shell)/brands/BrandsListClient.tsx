"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type BrandEntry = {
  name?: string;
  image?: string;
  group?: string;
  url?: string;
  editorial?: boolean;
  awards?: boolean;
  events?: boolean;
};

export default function BrandsListClient({
  initial,
}: {
  initial: Record<string, BrandEntry>;
}) {
  const [filter, setFilter] = useState("");

  const rows = useMemo(() => {
    const entries = Object.entries(initial);
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? entries.filter(
          ([k, v]) =>
            k.toLowerCase().includes(q) ||
            (v?.name ?? "").toLowerCase().includes(q),
        )
      : entries;
    return filtered.sort(([a], [b]) => a.localeCompare(b));
  }, [initial, filter]);

  return (
    <div>
      <input
        type="search"
        placeholder="Filter by code or name…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full max-w-sm border border-neutral-300 rounded px-3 py-2 text-sm mb-3"
      />
      <div className="border border-neutral-200 rounded bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Group</th>
              <th className="px-3 py-2 text-center">Editorial</th>
              <th className="px-3 py-2 text-center">Awards</th>
              <th className="px-3 py-2 text-center">Events</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([code, v]) => (
              <tr key={code} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-3 py-2 font-mono text-xs">
                  <Link
                    href={`/admin/brands/${encodeURIComponent(code)}`}
                    className="text-blue-700 hover:underline"
                  >
                    {code}
                  </Link>
                </td>
                <td className="px-3 py-2">{v?.name ?? ""}</td>
                <td className="px-3 py-2 text-neutral-600 text-xs">
                  {v?.group ?? ""}
                </td>
                <td className="px-3 py-2 text-center">{v?.editorial ? "✓" : ""}</td>
                <td className="px-3 py-2 text-center">{v?.awards ? "✓" : ""}</td>
                <td className="px-3 py-2 text-center">{v?.events ? "✓" : ""}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-neutral-400">
                  No brands match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
