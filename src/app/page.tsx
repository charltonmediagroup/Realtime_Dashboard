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
    <div className="bg-transparent min-h-screen flex items-start sm:items-center justify-center flex-col gap-6 px-4 py-10 text-lg">
      <h1 className="text-3xl font-bold">CMG GA4 Dashboard</h1>
      <div className="flex flex-col md:flex-row gap-10 md:gap-16">
        <div className="flex flex-col gap-2">
          <Link href="/dashboard/editorial" className="hover:underline font-semibold">
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
          <Link href="/dashboard/editorial/shorts" className="hover:underline ml-8">
            Editorial Shorts
          </Link>
          <Link href="/dashboard/editorial/leaderboard" className="hover:underline ml-8">
            Leaderboard
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <Link href="/dashboard/awards" className="hover:underline font-semibold">
            Awards
          </Link>
          <Link href="/dashboard/awards/qsr-uk" className="hover:underline ml-8">
            QSR UK
          </Link>
          <Link href="/dashboard/awards/qsr-aus" className="hover:underline ml-8">
            QSR AUS
          </Link>
          <Link href="/dashboard/awards/videos" className="hover:underline ml-8">
            Awards Videos
          </Link>
          <Link href="/dashboard/awards/shorts" className="hover:underline ml-8">
            Awards Shorts
          </Link>
          <Link href="/dashboard/awards/leaderboard" className="hover:underline ml-8">
            Leaderboard
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <Link href="/dashboard/bizzcon" className="hover:underline font-semibold">
            Bizzcon
          </Link>
          <Link href="/dashboard/bizzcon/videos" className="hover:underline ml-8">
            Bizzcon Videos
          </Link>
          <Link href="/dashboard/bizzcon/shorts" className="hover:underline ml-8">
            Bizzcon Shorts
          </Link>
          <Link href="/dashboard/bizzcon/leaderboard" className="hover:underline ml-8">
            Leaderboard
          </Link>
        </div>

        <div className="flex flex-col gap-1">
          <Link href="/dashboard/sbr" className="hover:underline">
            SBR
          </Link>
          <Link href="/dashboard/hkb" className="hover:underline">
            HKB
          </Link>
          <Link href="/dashboard/abf" className="hover:underline">
            ABF
          </Link>
          <Link href="/dashboard/ia" className="hover:underline">
            IA
          </Link>
          <Link href="/dashboard/ra" className="hover:underline">
            RA
          </Link>
          <Link href="/dashboard/ap" className="hover:underline">
            AP
          </Link>
          <Link href="/dashboard/hca" className="hover:underline">
            HCA
          </Link>
          <Link href="/dashboard/qsr" className="hover:underline">
            QSR
          </Link>
          <Link href="/dashboard/qsr-asia" className="hover:underline">
            QSR ASIA
          </Link>
          <Link href="/dashboard/qsr-aus" className="hover:underline">
            QSR AUS
          </Link>
          <Link href="/dashboard/qsr-uk" className="hover:underline">
            QSR UK
          </Link>
        </div>
      </div>

      <Link href="/all-active?grouped=true" className="hover:underline">
        View active users
      </Link>
    </div>
  );
}
