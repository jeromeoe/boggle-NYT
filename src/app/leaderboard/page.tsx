"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { getLeaderboardForDate, getRecentDates } from "@/lib/supabase/leaderboard";
import { getCurrentUser } from "@/lib/supabase/auth";
import type { LeaderboardEntry, User } from "@/lib/supabase/client";
import { TbArrowLeft, TbArrowRight, TbTrophy, TbCalendar } from "react-icons/tb";

const MEDALS = ["🥇", "🥈", "🥉"];

const AV_COLORS = ["#1A3C34", "#2D6A4F", "#9B2226", "#5C4033", "#6B4F9E", "#1A5B8A", "#7A3F00"];
function avatarColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}

function getSingaporeDate() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function offsetDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().split("T")[0];
}

export default function LeaderboardPage() {
  const today = getSingaporeDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const recentDates = getRecentDates(7);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const loadLeaderboard = useCallback(async (date: string) => {
    setLoading(true);
    const [data, countRes] = await Promise.all([
      getLeaderboardForDate(date, 100),
      supabase
        .from("daily_leaderboard")
        .select("*", { count: "exact", head: true })
        .eq("challenge_date", date),
    ]);
    setEntries(data);
    setTotalCount(countRes.count ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLeaderboard(selectedDate);
  }, [selectedDate, loadLeaderboard]);

  const isToday = selectedDate === today;
  const canGoForward = selectedDate < today;

  const userEntry = user ? entries.find(e => e.user_id === user.id) : null;

  return (
    <>
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Page title */}
        <div className="mb-8">
          <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "#8A8A8A", marginBottom: 6 }}>
            Daily Competition
          </div>
          <div className="flex items-end gap-4">
            <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 42, fontWeight: 700, color: "#1A3C34", letterSpacing: "-0.03em", lineHeight: 1 }}>
              Leaderboard
            </h1>
            <TbTrophy size={28} style={{ color: "#D4AF37", marginBottom: 4 }} />
          </div>
          {totalCount != null && totalCount > 0 && (
            <p style={{ fontFamily: "var(--font-geist-sans)", fontSize: 13, color: "#8A8A8A", marginTop: 6 }}>
              {totalCount.toLocaleString()} player{totalCount !== 1 ? "s" : ""} competed on {formatDateShort(selectedDate)}
            </p>
          )}
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <button
            onClick={() => setSelectedDate(d => offsetDate(d, -1))}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E6E4DD] rounded-[8px] text-[#1A3C34] hover:border-[#1A3C34] transition-colors"
            style={{ fontFamily: "var(--font-geist-sans)", fontSize: 12, fontWeight: 600 }}
          >
            <TbArrowLeft size={13} /> Prev
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {recentDates.slice().reverse().map(date => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`px-3 py-2 rounded-[8px] text-[12px] font-semibold transition-all border ${
                  date === selectedDate
                    ? "bg-[#1A3C34] text-[#EDE8DF] border-[#1A3C34]"
                    : "bg-white text-[#666] border-[#E6E4DD] hover:border-[#1A3C34] hover:text-[#1A3C34]"
                }`}
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                {date === today ? "Today" : formatDateShort(date)}
              </button>
            ))}
          </div>

          <button
            onClick={() => setSelectedDate(d => offsetDate(d, 1))}
            disabled={!canGoForward}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E6E4DD] rounded-[8px] text-[#1A3C34] hover:border-[#1A3C34] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ fontFamily: "var(--font-geist-sans)", fontSize: 12, fontWeight: 600 }}
          >
            Next <TbArrowRight size={13} />
          </button>
        </div>

        {/* Current date label */}
        <div className="flex items-center gap-3 mb-5">
          <TbCalendar size={14} style={{ color: "#8A8A8A" }} />
          <span style={{ fontFamily: "var(--font-geist-sans)", fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>
            {isToday ? "Today — " : ""}{formatDate(selectedDate)}
          </span>
          {isToday && (
            <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", background: "#2D6A4F", color: "#fff", padding: "2px 7px", borderRadius: 4 }}>
              Live
            </span>
          )}
        </div>

        {/* Your result callout */}
        {userEntry && (
          <div className="mb-5 p-4 rounded-[14px] border border-[#D4AF37]/40 bg-[#D4AF37]/6 flex items-center gap-4">
            <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 28, fontWeight: 700, color: "#D4AF37", lineHeight: 1 }}>
              #{userEntry.rank}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>Your result today</div>
              <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12, color: "#8A8A8A", marginTop: 2 }}>
                Score: {userEntry.net_score} · {userEntry.words_found} words
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white border border-[#E6E4DD] rounded-[16px] overflow-hidden" style={{ boxShadow: "0 2px 8px rgba(26,25,21,0.05)" }}>
          {/* Table header */}
          <div className="grid px-5 py-3 border-b border-[#E6E4DD] bg-[#F9F7F1]" style={{ gridTemplateColumns: "48px 1fr 80px 60px 80px" }}>
            {["Rank", "Player", "Score", "Words", "Time"].map(h => (
              <div key={h} style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#8A8A8A" }}>
                {h}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12, color: "#8A8A8A" }}>Loading…</div>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-16 text-center">
              <TbTrophy size={36} style={{ color: "#E6E4DD", margin: "0 auto 12px" }} />
              <p style={{ fontFamily: "var(--font-geist-sans)", fontSize: 14, fontWeight: 600, color: "#1A3C34" }}>No scores yet</p>
              <p style={{ fontFamily: "var(--font-geist-sans)", fontSize: 12, color: "#8A8A8A", marginTop: 4 }}>
                {isToday ? "Be the first to play today's board!" : "No one played on this date."}
              </p>
              {isToday && (
                <Link href="/" className="inline-block mt-4 px-5 py-2.5 bg-[#1A3C34] text-[#EDE8DF] text-sm font-semibold rounded-[10px] no-underline hover:brightness-110 transition-all">
                  Play Now →
                </Link>
              )}
            </div>
          ) : (
            entries.map((entry, i) => {
              const isYou = user?.id === entry.user_id;
              const name = entry.display_name || entry.username || "Player";
              const color = avatarColor(entry.user_id ?? String(i));
              const mins = Math.floor((entry.completion_time_seconds ?? 0) / 60);
              const secs = (entry.completion_time_seconds ?? 0) % 60;
              const timeStr = entry.completion_time_seconds ? `${mins}:${secs.toString().padStart(2, "0")}` : "—";

              return (
                <div
                  key={entry.user_id}
                  className={`grid px-5 py-3.5 border-b border-[#E6E4DD] last:border-b-0 items-center transition-colors ${
                    isYou
                      ? "bg-[rgba(212,175,55,0.06)] border-l-[3px] border-l-[#D4AF37] pl-[17px]"
                      : i < 3
                      ? "bg-[rgba(26,60,52,0.02)] hover:bg-[#F5F3EE]"
                      : "hover:bg-[#F9F7F1]"
                  }`}
                  style={{ gridTemplateColumns: "48px 1fr 80px 60px 80px" }}
                >
                  {/* Rank */}
                  <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 13, color: "#8A8A8A", fontWeight: i < 3 ? 700 : 400 }}>
                    {MEDALS[i] ?? `#${i + 1}`}
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
                        {entry.custom_tag && (
                          <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, color: "#8A8A8A", background: "rgba(26,25,21,0.05)", padding: "1px 5px", borderRadius: 3 }}>{entry.custom_tag}</span>
                        )}
                      </div>
                      <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, color: "#A8A49E" }}>@{entry.username}</div>
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 15, fontWeight: 700, color: "#1A3C34" }}>
                    {entry.net_score}
                  </div>

                  {/* Words */}
                  <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12, color: "#666" }}>
                    {entry.words_found}
                  </div>

                  {/* Time */}
                  <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12, color: "#666" }}>
                    {timeStr}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-between">
          <p style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, color: "#A8A49E" }}>
            Sorted by net score, then fastest completion time.
          </p>
          <Link href="/rankings" className="flex items-center gap-1.5 no-underline" style={{ fontFamily: "var(--font-geist-sans)", fontSize: 13, fontWeight: 600, color: "#1A3C34" }}>
            View ELO Rankings →
          </Link>
        </div>
      </div>
    </>
  );
}
