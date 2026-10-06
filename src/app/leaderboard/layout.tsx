import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily Word-Grid Leaderboard",
  description: "See today’s top Daily Challenge scores and fastest completion times on Moggle.org.",
  alternates: { canonical: "/leaderboard" },
};

export default function LeaderboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
