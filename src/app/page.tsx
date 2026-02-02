import Link from "next/link";

const BRANDS = [
  "sbr",
  "hkb",
  "abf",
  "abr",
  "ia",
  "ra",
  "ap",
  "hca",
  "qsr",
  "qsr-asia",
  "qsr-aus",
  "qsr-uk",
];

export default function Home() {
  return (
    <div className="bg-transparent min-h-screen flex items-start sm:items-center justify-center flex-col gap-4 px-2 py-8">
      <h1 className="text-xl font-bold">CMG GA4 Dashboard</h1>
      <div className="flex flex-col gap-2">

        <Link href="/dashboard/editorial" className="hover:underline">
          Editorial Dashboard
        </Link>
        <Link href="/dashboard/editorial/qsr-uk" className="hover:underline ml-4">
          QSR UK Editorial Dashboard
        </Link>
        <Link href="/dashboard/editorial/qsr-aus" className="hover:underline ml-4">
          QSR AUS Editorial Dashboard
        </Link>


        <Link href="/all-active?grouped=true" className="hover:underline mt-4">
          View active users
        </Link>

      </div>
    </div>
  );
}