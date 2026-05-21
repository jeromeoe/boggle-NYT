"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/supabase/auth";
import type { GameStats, User } from "@/lib/supabase/client";
import { TbTrophy, TbClock, TbLetterCase, TbAlertTriangle } from "react-icons/tb";

const AV_COLORS = ["#1A3C34", "#2D6A4F", "#9B2226", "#5C4033", "#6B4F9E", "#1A5B8A", "#7A3F00"];
function avatarColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}

function scoreColor(score: number) {
  if (score >= 100) return "#D4AF37";
  if (score >= 50) return "#2D6A4F";
  return "#1A3C34";
}

function BoardTile({ letter }: { letter: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-[10px] border select-none"
      style={{
        width: 56,
        height: 56,
        background: "rgba(26,60,52,0.06)",
        border: "1px solid rgba(26,60,52,0.14)",
      }}
    >
      <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 17, fontWeight: 700, color: "#1A3C34", lineHeight: 1 }}>
        {letter}
      </span>
    </div>
  );
}

function WordBadge({ word, penalized }: { word: string; penalized: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-[11.5px] font-semibold"
      style={{
        fontFamily: "var(--font-geist-mono)",
        background: penalized ? "rgba(155,34,38,0.08)" : "rgba(45,106,79,0.1)",
        color: penalized ? "#9B2226" : "#2D6A4F",
        border: `1px solid ${penalized ? "rgba(155,34,38,0.15)" : "rgba(45,106,79,0.2)"}`,
      }}
    >
      {penalized && <TbAlertTriangle size={10} />}
      {word}
    </span>
  );
}

export default function ReplayPage() {
  const params = useParams();
  const gameId = params.gameId as string;

  const [game, setGame] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [wordFilter, setWordFilter] = useState<"all" | "found" | "missed" | "penalized">("all");

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  useEffect(() => {
    async function load() {
      if (!gameId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("game_stats")
        .select("*")
        .eq("id", gameId)
        .maybeSingle();

      if (error) { setError("Could not load game."); setLoading(false); return; }
      if (!data) { setError("Game not found."); setLoading(false); return; }
      setGame(data as GameStats);
      setLoading(false);
    }
    load();
  }, [gameId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F7F1] flex items-center justify-center">
        <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 13, color: "#8A8A8A" }}>Loading game…</div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-[#F9F7F1] flex items-center justify-center flex-col gap-4">
        <TbAlertTriangle size={36} style={{ color: "#9B2226" }} />
        <p style={{ fontFamily: "var(--font-geist-sans)", fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>{error ?? "Game not found"}</p>
        <Link href="/" className="px-5 py-2.5 bg-[#1A3C34] text-[#EDE8DF] text-sm font-semibold rounded-[10px] no-underline">Back to Home</Link>
      </div>
    );
  }

  const board = game.board_state; // string[][]
  const foundWords = game.words_found ?? [];
  const penalizedWords = game.words_penalized ?? [];
  const mins = Math.floor((game.duration_seconds ?? 0) / 60);
  const secs = (game.duration_seconds ?? 0) % 60;
  const duration = `${mins}:${secs.toString().padStart(2, "0")}`;
  const playedDate = new Date(game.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const isOwn = user?.id === game.user_id;

  const allWords = [...foundWords, ...penalizedWords].sort();
  const filteredWords =
    wordFilter === "found" ? foundWords.slice().sort() :
    wordFilter === "penalized" ? penalizedWords.slice().sort() :
    allWords;

  const efficiency = game.total_possible_words > 0
    ? Math.round((foundWords.length / game.total_possible_words) * 100)
    : 0;

  return (
    <>
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Game header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "#8A8A8A" }}>
              {game.is_daily_challenge ? "Daily Challenge" : "Singleplayer Game"}
            </div>
            {game.is_daily_challenge && (
              <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", background: "#2D6A4F", color: "#fff", padding: "2px 7px", borderRadius: 4 }}>
                Ranked
              </span>
            )}
          </div>
          <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 36, fontWeight: 700, color: "#1A3C34", letterSpacing: "-0.03em", lineHeight: 1 }}>
            {playedDate}
          </h1>
          {!isOwn && (
            <p style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12, color: "#A8A49E", marginTop: 6 }}>
              Viewing another player's game
            </p>
          )}
        </div>

        <div className="flex gap-8 items-start flex-wrap lg:flex-nowrap">
          {/* Left: board + stats */}
          <div className="flex flex-col gap-6 flex-shrink-0">
            {/* Board */}
            <div>
              <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "#8A8A8A", marginBottom: 12 }}>
                Board
              </div>
              {board && board.length === 4 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 56px)", gap: 6 }}>
                  {board.flat().map((letter, i) => (
                    <BoardTile key={i} letter={letter} />
                  ))}
                </div>
              ) : (
                <div className="w-[254px] h-[254px] rounded-[14px] border border-[#E6E4DD] bg-white flex items-center justify-center">
                  <p style={{ fontFamily: "var(--font-geist-mono)", fontSize: 11, color: "#A8A49E" }}>Board not available</p>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3" style={{ width: 254 }}>
              {[
                { icon: <TbTrophy size={14} style={{ color: "#D4AF37" }} />, label: "Net Score", value: game.net_score, accent: scoreColor(game.net_score) },
                { icon: <TbLetterCase size={14} style={{ color: "#2D6A4F" }} />, label: "Words Found", value: foundWords.length },
                { icon: <TbClock size={14} style={{ color: "#1A5B8A" }} />, label: "Duration", value: duration },
                { icon: <TbAlertTriangle size={14} style={{ color: "#9B2226" }} />, label: "Penalties", value: penalizedWords.length },
              ].map(s => (
                <div key={s.label} className="bg-white border border-[#E6E4DD] rounded-[12px] p-3" style={{ boxShadow: "0 1px 3px rgba(26,25,21,0.04)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {s.icon}
                    <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8A8A8A" }}>{s.label}</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-fraunces)", fontSize: 22, fontWeight: 700, color: (s as any).accent ?? "#1A3C34", lineHeight: 1 }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Efficiency bar */}
            {game.total_possible_words > 0 && (
              <div className="bg-white border border-[#E6E4DD] rounded-[12px] p-4" style={{ width: 254, boxShadow: "0 1px 3px rgba(26,25,21,0.04)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8A8A8A" }}>Board Coverage</span>
                  <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12, fontWeight: 700, color: "#1A3C34" }}>{efficiency}%</span>
                </div>
                <div className="w-full h-2 bg-[#F0EEE8] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#2D6A4F] transition-all" style={{ width: `${efficiency}%` }} />
                </div>
                <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, color: "#A8A49E", marginTop: 5 }}>
                  {foundWords.length} of {game.total_possible_words} possible words
                </div>
              </div>
            )}

            {/* Scores breakdown */}
            <div className="bg-white border border-[#E6E4DD] rounded-[12px] p-4" style={{ width: 254, boxShadow: "0 1px 3px rgba(26,25,21,0.04)" }}>
              <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8A8A8A", marginBottom: 10 }}>Score Breakdown</div>
              <div className="space-y-2">
                {[
                  { label: "Gross Score", value: `+${game.gross_score}`, color: "#2D6A4F" },
                  { label: "Penalties", value: `-${game.penalty_score}`, color: "#9B2226" },
                  { label: "Net Score", value: game.net_score, color: "#1A3C34", bold: true },
                ].map(r => (
                  <div key={r.label} className={`flex justify-between items-center ${r.bold ? "pt-2 border-t border-[#E6E4DD]" : ""}`}>
                    <span style={{ fontFamily: "var(--font-geist-sans)", fontSize: 12, color: "#666" }}>{r.label}</span>
                    <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: r.bold ? 15 : 13, fontWeight: r.bold ? 700 : 400, color: r.color }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: words */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "#8A8A8A" }}>
                Words
              </div>
              <div className="flex items-center gap-1.5">
                {(["all", "found", "penalized"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setWordFilter(f)}
                    className={`px-2.5 py-1 rounded-[6px] text-[11px] font-semibold transition-all ${
                      wordFilter === f
                        ? "bg-[#1A3C34] text-[#EDE8DF]"
                        : "bg-[#F0EEE8] text-[#666] hover:bg-[#E8E6E0]"
                    }`}
                    style={{ fontFamily: "var(--font-geist-mono)" }}
                  >
                    {f === "all" ? `All (${allWords.length})` : f === "found" ? `Found (${foundWords.length})` : `Penalties (${penalizedWords.length})`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {filteredWords.length === 0 ? (
                <p style={{ fontFamily: "var(--font-geist-sans)", fontSize: 13, color: "#A8A49E" }}>No words in this category.</p>
              ) : (
                filteredWords.map(word => (
                  <WordBadge
                    key={word}
                    word={word}
                    penalized={penalizedWords.includes(word)}
                  />
                ))
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-[#E6E4DD]">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-[3px] bg-[rgba(45,106,79,0.1)] border border-[rgba(45,106,79,0.2)]" />
                <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, color: "#8A8A8A" }}>Valid word</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-[3px] bg-[rgba(155,34,38,0.08)] border border-[rgba(155,34,38,0.15)]" />
                <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, color: "#8A8A8A" }}>Penalized</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-10 flex items-center gap-4 pt-6 border-t border-[#E6E4DD]">
          <Link href="/" className="flex items-center gap-2 px-5 py-2.5 bg-[#1A3C34] text-[#EDE8DF] text-sm font-semibold rounded-[10px] no-underline hover:brightness-110 transition-all">
            Play Again →
          </Link>
          <Link href="/leaderboard" className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#E6E4DD] text-[#1A3C34] text-sm font-semibold rounded-[10px] no-underline hover:border-[#1A3C34] transition-all">
            Leaderboard
          </Link>
        </div>
      </div>
    </>
  );
}
