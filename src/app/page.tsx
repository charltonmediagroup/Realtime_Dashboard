import Link from "next/link";

const PUBLICATIONS = [
  { slug: "abf", name: "Asian Banking & Finance" },
  { slug: "ap", name: "Asian Power" },
  { slug: "hca", name: "Healthcare Asia" },
  { slug: "hkb", name: "Hong Kong Business" },
  { slug: "ia", name: "Insurance Asia" },
  { slug: "ra", name: "Retail Asia" },
  { slug: "sbr", name: "Singapore Business Review" },
];

const QSR_BRANDS = [
  { slug: "qsr", name: "QSR Media" },
  { slug: "qsr-asia", name: "QSR Media Asia" },
  { slug: "qsr-aus", name: "QSR Media Australia" },
  { slug: "qsr-uk", name: "QSR Media UK" },
];

export default function Home() {
  return (
    <div className="bg-transparent min-h-screen flex items-start sm:items-center justify-center flex-col gap-6 px-4 py-10 text-lg">
      <h1 className="text-3xl font-bold">CMG GA4 Dashboard</h1>
      <div className="flex flex-col md:flex-row gap-10 md:gap-16 [&_a]:block [&_a]:py-1">
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
          <Link href="/dashboard/awards/promo-event-highlights" className="hover:underline ml-8">
            Promo &amp; Event Highlights
          </Link>
          <Link href="/dashboard/awards/leaderboard" className="hover:underline ml-8">
            Leaderboard
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <Link href="/dashboard/bizzcon" className="hover:underline font-semibold">
            Bizzcon
          </Link>
          <Link href="/dashboard/bizzcon/leaderboard" className="hover:underline ml-8">
            Leaderboard
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-semibold">Publications</span>
          {PUBLICATIONS.map((b) => (
            <Link
              key={b.slug}
              href={`/dashboard/${b.slug}`}
              className="hover:underline ml-8"
            >
              {b.name}
            </Link>
          ))}
          {QSR_BRANDS.map((b) => (
            <Link
              key={b.slug}
              href={`/dashboard/${b.slug}`}
              className="hover:underline ml-8"
            >
              {b.name}
            </Link>
          ))}
        </div>
      </div>

      <Link href="/dashboard/mailchimp" className="hover:underline font-semibold">
        Mailchimp
      </Link>

      <Link href="/all-active?grouped=true" className="hover:underline">
        View active users
      </Link>

      <Link href="/admin" className="text-sm text-neutral-500 hover:underline">
        Admin
      </Link>
    </div>
  );
}
