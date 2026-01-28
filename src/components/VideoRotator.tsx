"use client";

import { useEffect, useRef } from "react";

interface VideoRotatorProps {
  xmlUrl: string;
  displayTime?: number;
  startIndex?: number;
  onError?: () => void;
}

export default function VideoRotator({
  xmlUrl,
  displayTime = 30,
  startIndex = 0,
  onError,
}: VideoRotatorProps) {
  const iframeA = useRef<HTMLIFrameElement>(null);
  const iframeB = useRef<HTMLIFrameElement>(null);
  const titleBox = useRef<HTMLDivElement>(null);

  const videos = useRef<{ title: string; link: string }[]>([]);
  const currentIndex = useRef(startIndex);
  const showingA = useRef(true);
  const intervalRef = useRef<number | null>(null);

  /* ---------- LOAD XML ---------- */
  useEffect(() => {
    if (!xmlUrl) return;

    fetch(xmlUrl + "?_ts=" + Date.now())
      .then(res => {
        if (!res.ok) throw new Error("XML fetch failed");
        return res.text();
      })
      .then(xmlText => {
        const xml = new DOMParser().parseFromString(xmlText, "application/xml");

        videos.current = Array.from(xml.querySelectorAll("item"))
          .map(item => ({
            title: item.querySelector("title")?.textContent?.trim() || "",
            link: item.querySelector("description")?.textContent?.trim() || "",
          }))
          .filter(v => v.link.includes("vimeo.com"));

        if (!videos.current.length) throw new Error("No videos");

        showInitial();

        intervalRef.current = window.setInterval(
          nextVideo,
          displayTime * 1000
        );
      })
      .catch(err => {
        console.error(err);
        onError?.();
      });

    return cleanup;
  }, [xmlUrl, displayTime]);

  /* ---------- CLEANUP (CRITICAL) ---------- */
  const cleanup = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    destroyIframe(iframeA.current);
    destroyIframe(iframeB.current);
  };

  const destroyIframe = (iframe: HTMLIFrameElement | null) => {
    if (!iframe) return;
    iframe.src = "";
  };

  /* ---------- INITIAL ---------- */
  const showInitial = () => {
    const first = videos.current[currentIndex.current];
    const next = videos.current[(currentIndex.current + 1) % videos.current.length];

    loadInto(iframeA.current, first.link);
    iframeA.current?.classList.add("active");

    if (titleBox.current) titleBox.current.textContent = first.title;

    loadInto(iframeB.current, next.link);
  };

  /* ---------- LOAD VIDEO ---------- */
  const loadInto = (iframe: HTMLIFrameElement | null, link: string) => {
    if (!iframe) return;
    const id = extractVimeoId(link);
    if (!id) return;

    iframe.src = `https://player.vimeo.com/video/${id}?autoplay=1&muted=1&background=1`;
  };

  /* ---------- ROTATION ---------- */
  const nextVideo = () => {
    currentIndex.current =
      (currentIndex.current + 1) % videos.current.length;

    const current = videos.current[currentIndex.current];
    const next =
      videos.current[(currentIndex.current + 1) % videos.current.length];

    // Title
    if (titleBox.current) {
      titleBox.current.style.opacity = "0";
      setTimeout(() => {
        titleBox.current!.textContent = current.title;
        titleBox.current!.style.opacity = "1";
      }, 200);
    }

    if (showingA.current) {
      iframeB.current?.classList.add("active");
      iframeA.current?.classList.remove("active");
      destroyIframe(iframeA.current); // 🔥 RELEASE MEMORY
      loadInto(iframeA.current, next.link);
    } else {
      iframeA.current?.classList.add("active");
      iframeB.current?.classList.remove("active");
      destroyIframe(iframeB.current); // 🔥 RELEASE MEMORY
      loadInto(iframeB.current, next.link);
    }

    showingA.current = !showingA.current;
  };

  const extractVimeoId = (url: string) =>
    url.match(/vimeo\.com\/(\d+)/)?.[1] || "";

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
          border: 0;
          opacity: 0;
          transition: opacity 1s ease-in-out;
        }

        .video-layer.active {
          opacity: 1;
          z-index: 1;
        }

        .video-title {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          margin-top: 10px;
          transition: opacity 0.3s;
          color: #333;
        }
      `}</style>

      <div className="video-wrapper">
        <div className="video-area">
          <iframe ref={iframeA} className="video-layer" allow="autoplay; fullscreen" />
          <iframe ref={iframeB} className="video-layer" allow="autoplay; fullscreen" />
        </div>
        <div ref={titleBox} className="video-title" />
      </div>
    </>
  );
}
