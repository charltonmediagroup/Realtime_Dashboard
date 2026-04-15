export interface VimeoVideo {
  id: string;
  title: string;
  description: string;
  uri: string;
  duration: number;
  thumbnail: string;
  embedHtml: string;
  createdTime: string;
  link: string;
  tags: string[];
}

interface VimeoApiPicture {
  sizes: { width: number; height: number; link: string }[];
}

interface VimeoApiVideo {
  uri: string;
  name: string;
  description: string | null;
  duration: number;
  created_time: string;
  link: string;
  embed: { html: string };
  pictures: VimeoApiPicture;
  tags: { name: string }[];
}

const VIMEO_API = "https://api.vimeo.com";

function getAccessToken(): string {
  const token = process.env.VIMEO_ACCESS_TOKEN;
  if (!token) throw new Error("VIMEO_ACCESS_TOKEN not set");
  return token;
}

function extractId(uri: string): string {
  return uri.replace("/videos/", "");
}

function pickThumbnail(pictures: VimeoApiPicture): string {
  const sorted = [...pictures.sizes].sort((a, b) => b.width - a.width);
  return sorted[0]?.link || "";
}

function mapVideo(v: VimeoApiVideo): VimeoVideo {
  return {
    id: extractId(v.uri),
    title: v.name,
    description: v.description || "",
    uri: v.uri,
    duration: v.duration,
    thumbnail: pickThumbnail(v.pictures),
    embedHtml: v.embed.html,
    createdTime: v.created_time,
    link: v.link,
    tags: v.tags.map((t) => t.name.toLowerCase()),
  };
}

export async function fetchVimeoVideos(
  tag?: string,
  perPage = 50,
): Promise<VimeoVideo[]> {
  const token = getAccessToken();

  const params = new URLSearchParams({
    per_page: String(perPage),
    sort: "date",
    direction: "desc",
    fields: "uri,name,description,duration,created_time,link,embed.html,pictures.sizes,tags.name",
  });

  if (tag) params.set("query", tag);

  const res = await fetch(`${VIMEO_API}/me/videos?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Vimeo API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const videos: VimeoApiVideo[] = json.data || [];

  return videos.map(mapVideo);
}

export async function fetchVimeoVideosByBrand(
  brandTag: string,
  perPage = 50,
): Promise<VimeoVideo[]> {
  const allVideos = await fetchVimeoVideos(brandTag, perPage);
  return allVideos;
}
