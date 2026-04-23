"use client";

import { useEffect, useState } from "react";

interface VimeoVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  createdTime: string;
  link: string;
  tags: string[];
  width: number;
  height: number;
  plays: number;
  privacy: string;
  language: string | null;
}

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function aspectLabel(w: number, h: number) {
  if (!w || !h) return "";
  const r = w / h;
  if (Math.abs(r - 16 / 9) < 0.02) return "16:9";
  if (Math.abs(r - 9 / 16) < 0.02) return "9:16";
  if (Math.abs(r - 1) < 0.02) return "1:1";
  if (Math.abs(r - 4 / 3) < 0.02) return "4:3";
  return r.toFixed(2);
}

function resolutionLabel(h: number) {
  if (h >= 2160) return "4K";
  if (h >= 1440) return "1440p";
  if (h >= 1080) return "1080p";
  if (h >= 720) return "720p";
  if (h >= 480) return "480p";
  return `${h}p`;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<VimeoVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState<VimeoVideo | null>(null);

  useEffect(() => {
    fetch("/api/videos")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setVideos(data.slice(0, 20));
        else setErr(data?.error || "Unexpected response");
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <h1 className="text-2xl font-semibold mb-6">Latest Videos</h1>

      {loading && <p className="text-neutral-400">Loading…</p>}
      {err && <p className="text-red-400">Error: {err}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {videos.map((v) => (
          <button
            key={v.id}
            onClick={() => setActive(v)}
            className="group text-left bg-neutral-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-neutral-400 transition"
          >
            <div className="relative aspect-video bg-neutral-800">
              {v.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={v.thumbnail}
                  alt={v.title}
                  className="w-full h-full object-cover group-hover:opacity-90"
                />
              )}
              <span className="absolute bottom-2 right-2 bg-black/70 text-xs px-2 py-0.5 rounded">
                {fmtDuration(v.duration)}
              </span>
              <span className="absolute top-2 left-2 bg-black/70 text-[10px] px-2 py-0.5 rounded">
                {resolutionLabel(v.height)} · {aspectLabel(v.width, v.height)}
              </span>
            </div>
            <div className="p-3 space-y-1">
              <div className="text-sm font-medium line-clamp-2">{v.title}</div>
              <div className="text-xs text-neutral-500 flex flex-wrap gap-x-2">
                <span>{new Date(v.createdTime).toLocaleDateString()}</span>
                <span>·</span>
                <span>{(v.plays ?? 0).toLocaleString()} plays</span>
                <span>·</span>
                <span className="capitalize">{v.privacy ?? "—"}</span>
              </div>
              <div className="text-[11px] text-neutral-600">
                {v.width ?? "?"}×{v.height ?? "?"}
                {v.language ? ` · ${v.language}` : ""}
              </div>
              {(v.tags?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {v.tags.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setActive(null)}
        >
          <div
            className="w-full max-w-5xl bg-neutral-900 rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video bg-black">
              <iframe
                src={`https://player.vimeo.com/video/${active.id}?autoplay=1`}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-4 space-y-2">
              <h2 className="text-lg font-semibold">{active.title}</h2>
              <div className="text-sm text-neutral-400 grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <div className="text-neutral-500 text-xs">Dimensions</div>
                  <div>
                    {active.width}×{active.height} ({aspectLabel(active.width, active.height)})
                  </div>
                </div>
                <div>
                  <div className="text-neutral-500 text-xs">Resolution</div>
                  <div>{resolutionLabel(active.height)}</div>
                </div>
                <div>
                  <div className="text-neutral-500 text-xs">Duration</div>
                  <div>{fmtDuration(active.duration)}</div>
                </div>
                <div>
                  <div className="text-neutral-500 text-xs">Plays</div>
                  <div>{(active.plays ?? 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-neutral-500 text-xs">Privacy</div>
                  <div className="capitalize">{active.privacy ?? "—"}</div>
                </div>
                <div>
                  <div className="text-neutral-500 text-xs">Language</div>
                  <div>{active.language || "—"}</div>
                </div>
                <div>
                  <div className="text-neutral-500 text-xs">Created</div>
                  <div>{new Date(active.createdTime).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-neutral-500 text-xs">Vimeo ID</div>
                  <div>
                    <a
                      href={active.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      {active.id}
                    </a>
                  </div>
                </div>
              </div>
              {active.description && (
                <div>
                  <div className="text-neutral-500 text-xs mt-2">Description</div>
                  <p className="text-sm text-neutral-300 whitespace-pre-wrap line-clamp-6">
                    {active.description}
                  </p>
                </div>
              )}
              {(active.tags?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {active.tags.map((t) => (
                    <span
                      key={t}
                      className="text-xs bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setActive(null)}
            className="absolute top-4 right-4 text-white text-2xl"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
