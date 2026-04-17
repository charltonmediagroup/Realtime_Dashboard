import Link from "next/link";

export default function BizzconVideosPage() {
  return (
    <div className="min-h-screen bg-gray-800 text-white flex flex-col items-center justify-center gap-6 sm:gap-8 px-4 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold uppercase text-center">Bizzcon Videos</h1>
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full max-w-md sm:max-w-none sm:w-auto">
        <Link
          href="/dashboard/bizzcon/videos/shorts"
          className="w-full sm:w-auto text-center px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg text-base sm:text-lg font-semibold uppercase transition-colors"
        >
          Shorts
        </Link>
        <Link
          href="/dashboard/bizzcon/videos/long-form"
          className="w-full sm:w-auto text-center px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg text-base sm:text-lg font-semibold uppercase transition-colors"
        >
          Long Form
        </Link>
      </div>
    </div>
  );
}
