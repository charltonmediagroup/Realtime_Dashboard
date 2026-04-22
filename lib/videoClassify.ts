import { VimeoVideo } from "@/lib/vimeo";

export type Department = "awards" | "bizzcon" | "editorial";
export type VideoFormat = "long-form" | "shorts";

export function classifyDepartment(title: string): Department {
  const t = (title || "").toLowerCase();
  if (t.includes("bizzcon")) return "bizzcon";
  if (t.includes("award")) return "awards";
  return "editorial";
}

export function classifyFormat(width: number, height: number): VideoFormat {
  if (!width || !height) return "long-form";
  return height > width ? "shorts" : "long-form";
}

export function filterVideos(
  videos: VimeoVideo[],
  department: Department,
  format: VideoFormat,
): VimeoVideo[] {
  return videos.filter(
    (v) =>
      classifyDepartment(v.title) === department &&
      classifyFormat(v.width, v.height) === format,
  );
}
