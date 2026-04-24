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
      <div className="flex gap-16">
        <div className="flex flex-col gap-2">
          <Link href="/dashboard/editorial" className="hover:underline">
            Editorial Dashboard
          </Link>
          <Link href="/dashboard/editorial/qsr-uk" className="hover:underline ml-8">
            QSR UK
          </Link>
          <Link href="/dashboard/editorial/qsr-aus" className="hover:underline ml-8">
            QSR AUS
          </Link>
          <Link href="/dashboard/editorial/videos" className="hover:underline ml-8">
            Editorial Videos
          </Link>
          <Link href="/dashboard/awards" className="hover:underline mt-8">
            Awards
          </Link>
          <Link href="/dashboard/awards/qsr-uk" className="hover:underline ml-8">
            QSR UK
          </Link>
          <Link href="/dashboard/awards/qsr-aus" className="hover:underline ml-8">
            QSR AUS
          </Link>
          <Link href="/dashboard/awards/leaderboard" className="hover:underline ml-8">
            Leaderboard
          </Link>

          <Link href="/dashboard/bizzcon" className="hover:underline mt-8">
            Bizzcon
          </Link>
          <Link href="/dashboard/bizzcon/leaderboard" className="hover:underline ml-8">
            Leaderboard
          </Link>

          <Link href="/all-active?grouped=true" className="hover:underline mt-4">
            View active users
          </Link>
        </div>
        <div className="flex flex-col">
          <Link href="/dashboard/sbr" className="hover:underline ml-8">
            SBR
          </Link>
          <Link href="/dashboard/hkb" className="hover:underline ml-8">
            HKB
          </Link>
          <Link href="/dashboard/abf" className="hover:underline ml-8">
            ABF
          </Link>
          <Link href="/dashboard/ia" className="hover:underline ml-8">
            IA
          </Link>
          <Link href="/dashboard/ra" className="hover:underline ml-8">
            RA
          </Link>
          <Link href="/dashboard/ap" className="hover:underline ml-8">
            AP
          </Link>
          <Link href="/dashboard/hca" className="hover:underline ml-8">
            HCA
          </Link>
          <Link href="/dashboard/qsr" className="hover:underline ml-8">
            QSR
          </Link>
          <Link href="/dashboard/qsr-asia" className="hover:underline ml-8">
            QSR ASIA
          </Link>
          <Link href="/dashboard/qsr-aus" className="hover:underline ml-8">
            QSR AUS
          </Link>
          <Link href="/dashboard/qsr-uk" className="hover:underline ml-8">
            QSR UK
          </Link>
        </div>
      </div>
    </div>
  );
}