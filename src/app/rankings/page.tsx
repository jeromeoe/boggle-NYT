"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/supabase/auth";
import type { User } from "@/lib/supabase/client";
import { TbStar, TbChartBar, TbFlame, TbTrophy } from "react-icons/tb";

const AV_COLORS = ["#1A3C34", "#2D6A4F", "#9B2226", "#5C4033", "#6B4F9E", "#1A5B8A", "#7A3F00"];
function avatarColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}

interface RatingRow {
  user_id: string;
  rating: number;
  username: string;
  display_name: string | null;
  games_played?: number;
  best_score?: number;
}

type SortKey = "rating" | "games" | "best";

export default function RankingsPage() {
  const [rows, setRows] = useState<RatingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("rating");

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Fetch ratings joined with user info
        const { data: ratingData } = await supabase
          .from("user_ratings")
          .select("user_id, rating, users!inner(username, display_name)")
          .order("rating", { ascending: false })
          .limit(100);

        if (!ratingData) { setLoading(false); return; }

        // Fetch game stats for each user
        const userIds = ratingData.map((r: any) => r.user_id);
        const { data: statsData } = await supabase
          .from("game_stats")
          .select("user_id, net_score")
          .in("user_id", userIds);

        // Aggregate stats
        const statMap = new Map<string, { games: number; best: number }>();
        (statsData ?? []).forEach((s: any) => {
          const existing = statMap.get(s.user_id) ?? { games: 0, best: 0 };
          statMap.set(s.user_id, {
            games: existing.games + 1,
            best: Math.max(existing.best, s.net_score ?? 0),
          });
        });

        const merged: RatingRow[] = ratingData.map((r: any) => ({
          user_id: r.user_id,
          rating: r.rating,
          username: (r.users as any).username,
          display_name: (r.users as any).display_name,
          games_played: statMap.get(r.user_id)?.games ?? 0,
          best_score: statMap.get(r.user_id)?.best ?? 0,
        }));

        setRows(merged);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    load();
  }, []);

  const sorted = [...rows].sort((a, b) => {
    if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
    if (sortBy === "games") return (b.games_played ?? 0) - (a.games_played ?? 0);
    return (b.best_score ?? 0) - (a.best_score ?? 0);
  });

  const userRank = user ? sorted.findIndex(r => r.user_id === user.id) + 1 : 0;
  const userRow = user ? sorted.find(r => r.user_id === user.id) : null;

  const sortTabs: { key: SortKey; label: string; icon: React.ReactNode }[] = [
    { key: "rating", label: "ELO Rating", icon: <TbStar size={13} /> },
    { key: "games", label: "Games Played", icon: <TbChartBar size={13} /> },
    { key: "best", label: "Best Score", icon: <TbTrophy size={13} /> },
  ];

  return (
    <>
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Title */}
        <div className="mb-8">
          <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "#8A8A8A", marginBottom: 6 }}>
            All-time standings
          </div>
          <div className="flex items-end gap-4">
            <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 42, fontWeight: 700, color: "#1A3C34", letterSpacing: "-0.03em", lineHeight: 1 }}>
              Rankings
            </h1>
            <TbFlame size={28} style={{ color: "#D4AF37", marginBottom: 4 }} />
          </div>
          <p style={{ fontFamily: "var(--font-geist-sans)", fontSize: 13, color: "#8A8A8A", marginTop: 6 }}>
            ELO ratings based on daily challenge performance. Play more to climb.
          </p>
        </div>

        {/* Sort tabs */}
        <div className="flex items-center gap-2 mb-6">
          {sortTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setSortBy(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[12.5px] font-semibold transition-all border ${
                sortBy === tab.key
                  ? "bg-[#1A3C34] text-[#EDE8DF] border-[#1A3C34]"
                  : "bg-white text-[#666] border-[#E6E4DD] hover:border-[#1A3C34] hover:text-[#1A3C34]"
              }`}
              style={{ fontFamily: "var(--font-geist-sans)" }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Your rank callout */}
        {userRow && userRank > 0 && (
          <div className="mb-5 p-4 rounded-[14px] border border-[#D4AF37]/40 bg-[#D4AF37]/6 flex items-center gap-4">
            <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 28, fontWeight: 700, color: "#D4AF37", lineHeight: 1 }}>
              #{userRank}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>Your ranking</div>
              <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12, color: "#8A8A8A", marginTop: 2 }}>
                Rating: {userRow.rating} · {userRow.games_played} games · Best: {userRow.best_score}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white border border-[#E6E4DD] rounded-[16px] overflow-hidden" style={{ boxShadow: "0 2px 8px rgba(26,25,21,0.05)" }}>
          {/* Header */}
          <div className="grid px-5 py-3 border-b border-[#E6E4DD] bg-[#F9F7F1]" style={{ gridTemplateColumns: "52px 1fr 90px 80px 80px" }}>
            {["Rank", "Player", "ELO", "Games", "Best"].map(h => (
              <div key={h} style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#8A8A8A" }}>
                {h}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12, color: "#8A8A8A" }}>Loading…</div>
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-16 text-center">
              <TbStar size={36} style={{ color: "#E6E4DD", margin: "0 auto 12px" }} />
              <p style={{ fontFamily: "var(--font-geist-sans)", fontSize: 14, fontWeight: 600, color: "#1A3C34" }}>No ratings yet</p>
              <p style={{ fontFamily: "var(--font-geist-sans)", fontSize: 12, color: "#8A8A8A", marginTop: 4 }}>Play daily challenges to earn your ELO rating.</p>
              <Link href="/" className="inline-block mt-4 px-5 py-2.5 bg-[#1A3C34] text-[#EDE8DF] text-sm font-semibold rounded-[10px] no-underline hover:brightness-110 transition-all">
                Play Now →
              </Link>
            </div>
          ) : (
            sorted.map((row, i) => {
              const isYou = user?.id === row.user_id;
              const name = row.display_name || row.username;
              const color = avatarColor(row.user_id);

              return (
                <div
                  key={row.user_id}
                  className={`grid px-5 py-3.5 border-b border-[#E6E4DD] last:border-b-0 items-center transition-colors ${
                    isYou
                      ? "bg-[rgba(212,175,55,0.06)] border-l-[3px] border-l-[#D4AF37] pl-[17px]"
                      : i < 3
                      ? "bg-[rgba(26,60,52,0.02)] hover:bg-[#F5F3EE]"
                      : "hover:bg-[#F9F7F1]"
                  }`}
                  style={{ gridTemplateColumns: "52px 1fr 90px 80px 80px" }}
                >
                  {/* Rank */}
                  <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 13, fontWeight: i < 3 ? 700 : 400, color: i === 0 ? "#D4AF37" : i === 1 ? "#8A8A8A" : i === 2 ? "#A07820" : "#8A8A8A" }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </div>

                  {/* Player */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div style={{ background: color, width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#EDE8DF", flexShrink: 0 }}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontFamily: "var(--font-geist-sans)", fontSize: 13, fontWeight: 600, color: "#1A1A1A" }} className="truncate">{name}</span>
                        {isYou && (
                          <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, fontWeight: 700, background: "#D4AF37", color: "#111F1C", padding: "1px 5px", borderRadius: 3 }}>YOU</span>
                        )}
                      </div>
                      <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, color: "#A8A49E" }}>@{row.username}</div>
                    </div>
                  </div>

                  {/* ELO */}
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 15, fontWeight: 700, color: sortBy === "rating" ? "#1A3C34" : "#666" }}>
                      {row.rating}
                    </span>
                    {i < 3 && sortBy === "rating" && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                    )}
                  </div>

                  {/* Games */}
                  <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 13, fontWeight: sortBy === "games" ? 700 : 400, color: sortBy === "games" ? "#1A3C34" : "#666" }}>
                    {row.games_played ?? 0}
                  </div>

                  {/* Best */}
                  <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 13, fontWeight: sortBy === "best" ? 700 : 400, color: sortBy === "best" ? "#1A3C34" : "#666" }}>
                    {row.best_score ?? 0}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-between">
          <p style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, color: "#A8A49E" }}>
            ELO updated after each daily challenge.
          </p>
          <Link href="/leaderboard" className="flex items-center gap-1.5 no-underline" style={{ fontFamily: "var(--font-geist-sans)", fontSize: 13, fontWeight: 600, color: "#1A3C34" }}>
            ← Today's Leaderboard
          </Link>
        </div>
      </div>
    </>
  );
}
