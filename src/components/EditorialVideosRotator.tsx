"use client";

import { useEffect, useRef } from "react";
import Player from "@vimeo/player";

interface EditorialVideosRotatorProps {
  xmlUrl?: string | string[];
  videos?: { title: string; link: string }[];
  displayTime?: number;
  startIndex?: number;
  onError?: () => void;
}

export default function EditorialVideosRotator({
  xmlUrl,
  videos: directVideos,
  displayTime = 30,
  startIndex = 0,
  onError,
}: EditorialVideosRotatorProps) {
  const containerA = useRef<HTMLDivElement>(null);
  const containerB = useRef<HTMLDivElement>(null);
  const playerA = useRef<Player | null>(null);
  const playerB = useRef<Player | null>(null);
  const titleBox = useRef<HTMLDivElement>(null);
  const captionBox = useRef<HTMLDivElement>(null);

  const videos = useRef<{ title: string; link: string }[]>([]);
  const currentIndex = useRef(startIndex);
  const showingA = useRef(true);
  const intervalRef = useRef<number | null>(null);

  const urlList = Array.isArray(xmlUrl) ? xmlUrl : xmlUrl ? [xmlUrl] : [];
  const urlKey = urlList.join("|");
  const directKey = directVideos ? directVideos.map((v) => v.link).join("|") : "";

  /* ---------- LOAD DIRECT VIDEOS ---------- */
  useEffect(() => {
    if (!directVideos || !directVideos.length) return;
    videos.current = directVideos.filter((v) => v.link.includes("vimeo.com"));
    if (!videos.current.length) return;
    showInitial();
    intervalRef.current = window.setInterval(nextVideo, displayTime * 1000);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directKey, displayTime]);

  /* ---------- LOAD XML ---------- */
  useEffect(() => {
    if (directVideos && directVideos.length) return;
    const urls = urlList.filter(Boolean);
    if (!urls.length) return;

    const parseItems = (xmlText: string) => {
      const xml = new DOMParser().parseFromString(xmlText, "application/xml");
      return Array.from(xml.querySelectorAll("item"))
        .map(item => ({
          title: item.querySelector("title")?.textContent?.trim() || "",
          link: item.querySelector("description")?.textContent?.trim() || "",
        }))
        .filter(v => v.link.includes("vimeo.com") && !/Awards/i.test(v.title));
    };

    Promise.all(
      urls.map(u =>
        fetch(u + "?_ts=" + Date.now())
          .then(res => (res.ok ? res.text() : Promise.reject(new Error("XML fetch failed"))))
          .then(parseItems)
          .catch(() => [] as { title: string; link: string }[]),
      ),
    )
      .then(results => {
        const merged: { title: string; link: string }[] = [];
        const maxLen = Math.max(...results.map(r => r.length), 0);
        for (let i = 0; i < maxLen; i++) {
          for (const r of results) if (r[i]) merged.push(r[i]);
        }

        videos.current = merged;
        if (!videos.current.length) throw new Error("No videos");

        showInitial();

        intervalRef.current = window.setInterval(nextVideo, displayTime * 1000);
      })
      .catch(err => {
        console.error(err);
        onError?.();
      });

    return cleanup;
  }, [urlKey, displayTime]);

  /* ---------- CLEANUP ---------- */
  const cleanup = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    destroyPlayer(playerA);
    destroyPlayer(playerB);
  };

  const destroyPlayer = (playerRef: React.RefObject<Player | null>) => {
    playerRef.current?.destroy().catch(() => {});
    playerRef.current = null;
  };

  /* ---------- LOAD VIDEO ---------- */
  const loadInto = (
    container: HTMLDivElement | null,
    playerRef: React.RefObject<Player | null>,
    link: string,
    paused = false,
  ) => {
    if (!container) return;
    const id = extractVimeoId(link);
    if (!id) return;

    playerRef.current?.destroy().catch(() => {});
    playerRef.current = null;
    container.innerHTML = "";

    const player = new Player(container, {
      id: Number(id),
      // preloads use autoplay:false so ready()→pause() race can't happen
      autoplay: !paused,
      muted: true,
      controls: false,
      loop: true,   // loop short videos so they never freeze on the last frame
      transparent: true,
      width: container.offsetWidth || 1280,
      height: container.offsetHeight || 720,
    });

    playerRef.current = player;

    // Each async Vimeo call can land after the player is destroyed (next
    // rotation, unmount, or a failed load), which the SDK logs as
    // "Unknown player. Probably unloaded." Bail out as soon as the ref
    // no longer points at this player.
    const alive = () => playerRef.current === player;

    player.ready().then(async () => {
      if (!alive()) return;
      if (!paused) player.play().catch(() => {});

      try {
        const tracks = await player.getTextTracks();
        if (!alive()) return;
        const track =
          tracks.find(t => t.kind === "captions") ??
          tracks.find(t => t.kind === "subtitles") ??
          tracks[0];
        if (track) await player.enableTextTrack(track.language, track.kind);
      } catch {}

      if (!alive()) return;
      try {
        player.on("cuechange", (data: { cues: Array<{ text: string }> }) => {
          if (captionBox.current) {
            captionBox.current.textContent = data.cues.map(c => c.text).join("\n");
          }
        });
      } catch {}
    }).catch(() => {});
  };

  /* ---------- ACTIVATE + CROSSFADE ---------- */
  // Waits until the incoming player is actually playing before crossfading,
  // so the outgoing video stays visible during buffering (no blank-frame flash).
  const activateAndSwitch = (
    incomingPlayer: Player | null,
    incomingContainer: React.RefObject<HTMLDivElement | null>,
    outgoingContainer: React.RefObject<HTMLDivElement | null>,
    afterSwitch: () => void,
  ) => {
    if (captionBox.current) captionBox.current.textContent = "";

    let done = false;
    const doSwitch = () => {
      if (done) return;
      done = true;
      incomingContainer.current?.classList.add("active");
      outgoingContainer.current?.classList.remove("active");
      afterSwitch();
      watchPlayback(incomingPlayer);
    };

    if (!incomingPlayer) { doSwitch(); return; }

    // Fallback: switch anyway after 4 s if the video never fires 'playing'
    const fallback = setTimeout(doSwitch, 4000);

    const handler = () => {
      clearTimeout(fallback);
      incomingPlayer.off("playing", handler);
      doSwitch();
    };

    incomingPlayer.on("playing", handler);
    incomingPlayer.play().catch(() => { clearTimeout(fallback); doSwitch(); });
  };

  /* ---------- PLAYBACK WATCHDOG ---------- */
  // Some Vimeo videos end up "active" but stuck on the poster frame
  // (embed restrictions, autoplay policy, or a slow buffer after the
  // preload→play switch). If currentTime hasn't advanced 2.5 s after
  // the crossfade, skip the stuck video and reset the rotation clock.
  const watchPlayback = (player: Player | null) => {
    if (!player) return;
    // Only touch the player while it is still the active or preload instance;
    // once destroyed, Vimeo's SDK logs "Unknown player. Probably unloaded."
    const alive = () => playerA.current === player || playerB.current === player;

    let startTime = 0;
    if (!alive()) return;
    player.getCurrentTime().then(t => { if (alive()) startTime = t; }).catch(() => {});

    setTimeout(async () => {
      if (!alive()) return;
      try {
        const now = await player.getCurrentTime();
        if (!alive()) return;
        if (now - startTime < 0.2) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = window.setInterval(nextVideo, displayTime * 1000);
          }
          nextVideo();
        }
      } catch {}
    }, 2500);
  };

  /* ---------- INITIAL ---------- */
  const showInitial = () => {
    const first = videos.current[currentIndex.current];
    const next = videos.current[(currentIndex.current + 1) % videos.current.length];

    loadInto(containerA.current, playerA, first.link);
    containerA.current?.classList.add("active");

    if (titleBox.current) titleBox.current.textContent = first.title;

    // Preload next video paused so it doesn't compete for bandwidth
    loadInto(containerB.current, playerB, next.link, true);
  };

  /* ---------- ROTATION ---------- */
  const nextVideo = () => {
    currentIndex.current = (currentIndex.current + 1) % videos.current.length;

    const current = videos.current[currentIndex.current];
    const next = videos.current[(currentIndex.current + 1) % videos.current.length];

    if (titleBox.current) {
      titleBox.current.style.opacity = "0";
      setTimeout(() => {
        titleBox.current!.textContent = current.title;
        titleBox.current!.style.opacity = "1";
      }, 200);
    }

    if (showingA.current) {
      activateAndSwitch(playerB.current, containerB, containerA, () => {
        destroyPlayer(playerA);
        loadInto(containerA.current, playerA, next.link, true);
      });
    } else {
      activateAndSwitch(playerA.current, containerA, containerB, () => {
        destroyPlayer(playerB);
        loadInto(containerB.current, playerB, next.link, true);
      });
    }

    showingA.current = !showingA.current;
  };

  const extractVimeoId = (url: string) =>
    // Handles: vimeo.com/ID, player.vimeo.com/video/ID, vimeo.com/*/ID
    url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1] ||
    url.match(/vimeo\.com\/[^/\s]+\/(\d+)/)?.[1] ||
    "";

  /* ---------- UI ---------- */
  return (
    <>
      <style>{`
        .video-wrapper {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
        }

        .video-area {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
        }

        .video-layer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          transition: opacity 1s ease-in-out;
          overflow: hidden;
        }

        .video-layer.active {
          opacity: 1;
          z-index: 1;
        }

        .video-layer iframe {
          width: 100% !important;
          height: 100% !important;
          border: 0 !important;
          display: block;
        }

        .video-title {
          font-size: clamp(16px, 2vh, 22px);
          font-weight: bold;
          text-align: center;
          margin-top: 10px;
          transition: opacity 0.3s;
          color: #333;
        }

        .caption-overlay {
          position: absolute;
          bottom: 15%;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          width: 80%;
          text-align: center;
          pointer-events: none;
          color: white;
          font-size: clamp(22px, 3.2vw, 42px);
          line-height: 1.5;
          white-space: pre-line;
        }

        .caption-overlay:not(:empty) {
          background: rgba(0, 0, 0, 0.72);
          padding: 4px 14px;
          border-radius: 3px;
        }
      `}</style>

      <div className="video-wrapper">
        <div className="video-area">
          <div ref={containerA} className="video-layer" />
          <div ref={containerB} className="video-layer" />
          <div ref={captionBox} className="caption-overlay" />
        </div>
        <div ref={titleBox} className="video-title" />
      </div>
    </>
  );
}
