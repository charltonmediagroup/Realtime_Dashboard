import Link from "next/link";

export default function BizzconVideosPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-8">
      <h1 className="text-3xl font-bold uppercase">Bizzcon Videos</h1>
      <div className="flex gap-6">
        <Link
          href="/dashboard/bizzcon/videos/shorts"
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-semibold uppercase transition-colors"
        >
          Shorts
        </Link>
        <Link
          href="/dashboard/bizzcon/videos/long-form"
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-semibold uppercase transition-colors"
        >
          Long Form
        </Link>
      </div>
    </div>
  );
}
