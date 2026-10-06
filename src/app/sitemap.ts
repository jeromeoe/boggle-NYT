import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

const publicRoutes: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/play", changeFrequency: "monthly", priority: 0.9 },
  { path: "/play/daily", changeFrequency: "daily", priority: 0.9 },
  { path: "/play/blitz", changeFrequency: "monthly", priority: 0.8 },
  { path: "/play/rapid", changeFrequency: "monthly", priority: 0.8 },
  { path: "/play/zen", changeFrequency: "monthly", priority: 0.7 },
  { path: "/practice", changeFrequency: "monthly", priority: 0.7 },
  { path: "/leaderboard", changeFrequency: "daily", priority: 0.7 },
  { path: "/rankings", changeFrequency: "daily", priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map(({ path, changeFrequency, priority }) => ({
    url: absoluteUrl(path),
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
