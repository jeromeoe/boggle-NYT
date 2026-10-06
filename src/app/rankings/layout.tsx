import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Word-Grid Player Rankings",
  description: "Explore all-time Moggle.org player rankings, game counts, and best Daily Challenge scores.",
  alternates: { canonical: "/rankings" },
};

export default function RankingsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
