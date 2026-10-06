import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Moggle.org — Free Online Word Game",
    short_name: "Moggle",
    description: "A free daily word-grid game with timed and relaxed modes.",
    start_url: "/",
    display: "standalone",
    background_color: "#F9F7F1",
    theme_color: "#1A3C34",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
