"use client";

interface VimeoEmbedProps {
  videoId: string;
  title?: string;
  autoplay?: boolean;
  className?: string;
}

export default function VimeoEmbed({
  videoId,
  title = "",
  autoplay = false,
  className = "",
}: VimeoEmbedProps) {
  const params = new URLSearchParams({
    badge: "0",
    autopause: "0",
    player_id: "0",
    app_id: "58479",
  });

  if (autoplay) params.set("autoplay", "1");

  return (
    <div className={`relative w-full overflow-hidden ${className}`} style={{ paddingBottom: "56.25%" }}>
      <iframe
        src={`https://player.vimeo.com/video/${videoId}?${params}`}
        title={title}
        className="absolute inset-0 w-full h-full"
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
