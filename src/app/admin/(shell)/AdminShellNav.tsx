"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV: { href: string; label: string }[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/roster", label: "Editorial team" },
  { href: "/admin/brands", label: "Brands" },
  { href: "/admin/ga4", label: "GA4 properties" },
  { href: "/admin/references", label: "References" },
  { href: "/admin/docs", label: "Docs (raw)" },
  { href: "/admin/users", label: "Users" },
];

export default function AdminShellNav({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <aside className="w-56 shrink-0 border-r border-neutral-200 bg-white flex flex-col">
      <div className="px-4 py-4 border-b border-neutral-200">
        <Link href="/admin" className="font-semibold text-sm">
          CMG Admin
        </Link>
        <div className="text-xs text-neutral-500 mt-0.5 truncate">{username}</div>
      </div>

      <nav className="flex-1 py-2 text-sm">
        {NAV.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-2 hover:bg-neutral-100 ${
                active ? "bg-neutral-100 font-medium" : "text-neutral-700"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-200 p-3">
        <button
          onClick={signOut}
          className="w-full text-left text-sm text-neutral-600 hover:text-neutral-900"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
