"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { getTodaysLeaderboard } from "@/lib/supabase/leaderboard";
import type { User, LeaderboardEntry } from "@/lib/supabase/client";
import { TbBrain, TbPlayerPlay, TbUsers, TbSend, TbX } from "react-icons/tb";
import { MoggleMailView } from "@/components/mail/MoggleMailView";
import { findCandidateTrail, type CandidateTrail } from "@/lib/boggle/pathFinder";
import { getReducedMotionEnabled } from "@/lib/preferences";
import { Engraving } from "@/components/shared/Engraving";

// ── Singapore date (matches leaderboard daily boundary) ──
function getSingaporeDate() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── SVG icon helper ──
function Ico({ d, size = 18 }: { d: string | string[]; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  );
}

const ICONS = {
  play: "M5 3l14 9-14 9V3z",
  users: ["M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zM8 13c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zM16 13c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"],
  brain: ["M9.5 2a4.5 4.5 0 0 1 4.5 4.5v3a4.5 4.5 0 0 1-9 0V6.5A4.5 4.5 0 0 1 9.5 2z", "M9 14c0 2 2 3 4 3s4-1 4-3"],
  trophy: ["M8 21h8M12 17v4", "M17 4h3v3a4 4 0 0 1-4 4M7 4H4v3a4 4 0 0 0 4 4M7 4v6a5 5 0 0 0 10 0V4z"],
  globe: ["M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z", "M2 12h20", "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"],
  settings: ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"],
  eye: ["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z", "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"],
  plus: "M12 5v14M5 12h14",
  lock: ["M5 11a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8z", "M8 11V7a4 4 0 0 1 8 0v4"],
  bolt: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  mail: ["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z", "M22 6l-10 7L2 6"],
};

// ── Avatar colour pool ──
const AV_COLORS = ["#1A3C34", "#2D6A4F", "#9B2226", "#5C4033", "#6B4F9E", "#1A5B8A", "#7A3F00"];
function avatarColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}

const MEDALS = ["1", "2", "3"];

// ── Preview board helpers (client-side, never reveals real board) ──
const COMMON = "AAABCDDEEEEEFFGGHIIIJKLLLMNNNOOOOPPRRRSSSTTTUUUVWXYZ";
function randomPreviewBoard(): string[] {
  return Array.from({ length: 16 }, () => COMMON[Math.floor(Math.random() * COMMON.length)]);
}

function buildPreviewTrails(board2d: string[][], count = 6): CandidateTrail[] {
  const trails: CandidateTrail[] = [];
  let attempts = 0;
  while (trails.length < count && attempts < count * 4) {
    attempts++;
    let r = Math.floor(Math.random() * 4);
    let c = Math.floor(Math.random() * 4);
    let word = board2d[r][c];
    const visited = new Set([`${r},${c}`]);
    const len = 3 + Math.floor(Math.random() * 3);
    for (let s = 0; s < len - 1; s++) {
      const nbrs: [number, number][] = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4 && !visited.has(`${nr},${nc}`)) nbrs.push([nr, nc]);
        }
      }
      if (!nbrs.length) break;
      [r, c] = nbrs[Math.floor(Math.random() * nbrs.length)];
      word += board2d[r][c];
      visited.add(`${r},${c}`);
    }
    if (word.length >= 3) {
      const trail = findCandidateTrail(word, board2d);
      if (trail.activeCells.size > 0) trails.push(trail);
    }
  }
  return trails;
}

// ── Types ──
interface DailyResult {
  played: boolean;
  score: number | null;
  wordsFound: number | null;
  rank: number | null;
  totalPlayers: number | null;
  gameId: string | null;
}

interface GameStatRow {
  id: string;
  net_score: number | null;
  gross_score: number | null;
  words_found: string[] | null;
  created_at: string | null;
  duration_seconds: number | null;
  is_daily_challenge: boolean | null;
}

interface UserStats {
  games_played: number | null;
  best_net_score: number | null;
  current_streak: number | null;
}

interface FriendRow {
  friendship_id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  rating: number;
  is_online: boolean;
  last_seen_at: string | null;
}

interface PendingRequest {
  id: string;
  requester: { id: string; username: string; display_name: string | null };
}

// ── Mini board tile — mirrors real Tile component exactly ──
function MiniTile({ letter, lit, found, skeleton }: { letter: string; lit: boolean; found: boolean; skeleton: boolean }) {
  if (skeleton) {
    return (
      <div style={{ background: "rgba(237,232,223,0.08)", border: "1px solid rgba(237,232,223,0.12)", width: 46, height: 46, borderRadius: 9, transition: "none" }} className="flex-shrink-0 animate-pulse" />
    );
  }
  return (
    <div
      style={{
        background: lit ? "#1A3C34" : found ? "rgba(45,106,79,0.12)" : "#F9F7F1",
        border: `1px solid ${lit ? "#0F2016" : found ? "rgba(45,106,79,0.3)" : "#E6E4DD"}`,
        color: lit ? "#F9F7F1" : found ? "#2D6A4F" : "#1A1A1A",
        width: 46, height: 46, borderRadius: 9,
        boxShadow: lit
          ? "0 4px 14px -2px rgba(26,60,52,0.5), inset 0 -2px 0 rgba(0,0,0,0.15)"
          : "2px 2px 0 0 rgba(26,60,52,0.08), inset 0 -2px 0 rgba(0,0,0,0.04)",
        transform: lit ? "scale(1.08) translateY(-1px)" : "scale(1)",
        transition: "background 220ms, border-color 220ms, box-shadow 220ms, color 220ms, transform 220ms",
      }}
      className="flex items-center justify-center flex-shrink-0"
    >
      <span style={{ fontFamily: "var(--font-fraunces)", fontSize: 17, fontWeight: 700, lineHeight: 1 }}>
        {letter}
      </span>
    </div>
  );
}

// ── Daily Hero ──
function DailyHero({ userId, onPlayDaily, onStartGame }: {
  userId: string;
  onPlayDaily: () => void;
  onStartGame: () => void;
}) {
  const [result, setResult] = useState<DailyResult | null>(null);
  const [loading, setLoading] = useState(true);

  const [{ previewBoard, previewTrails }] = useState(() => {
    const board = randomPreviewBoard();
    const board2d = Array.from({ length: 4 }, (_, r) => board.slice(r * 4, r * 4 + 4));
    return { previewBoard: board, previewTrails: buildPreviewTrails(board2d, 7) };
  });
  const [litCells, setLitCells] = useState<Set<string>>(new Set());
  const [litEdges, setLitEdges] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const today = getSingaporeDate();
      const [scoreRes, countRes] = await Promise.all([
        supabase
          .from("daily_leaderboard")
          .select("net_score, words_found, rank")
          .eq("user_id", userId)
          .eq("challenge_date", today)
          .maybeSingle(),
        supabase
          .from("daily_leaderboard")
          .select("*", { count: "exact", head: true })
          .eq("challenge_date", today),
      ]);

      const totalPlayers = countRes.count ?? null;

      if (scoreRes.data) {
        const { data: gameRow } = await supabase
          .from("game_stats")
          .select("id")
          .eq("user_id", userId)
          .eq("is_daily_challenge", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        setResult({
          played: true,
          score: scoreRes.data.net_score,
          wordsFound: scoreRes.data.words_found,
          rank: scoreRes.data.rank,
          totalPlayers,
          gameId: gameRow?.id ?? null,
        });
      } else {
        setResult({ played: false, score: null, wordsFound: null, rank: null, totalPlayers, gameId: null });
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  useEffect(() => {
    if (loading || result?.played || !previewTrails.length) {
      setLitCells(new Set()); setLitEdges(new Set()); return;
    }
    // Honor reduced motion: show one static lit trail instead of cycling.
    if (getReducedMotionEnabled()) {
      setLitCells(previewTrails[0].activeCells);
      setLitEdges(previewTrails[0].activeEdges);
      return;
    }
    let idx = 0;
    const t = setInterval(() => {
      const trail = previewTrails[idx % previewTrails.length];
      setLitCells(trail.activeCells);
      setLitEdges(trail.activeEdges);
      idx++;
    }, 1400);
    return () => clearInterval(t);
  }, [loading, result?.played, previewTrails]);

  const dateLabel = new Date().toLocaleDateString("en-US", { timeZone: "Asia/Singapore", weekday: "long", month: "long", day: "numeric" });

  return (
    <div style={{ background: "linear-gradient(135deg, #1A3C34 0%, #0F2016 60%, #162E20 100%)", border: "1px solid rgba(212,175,55,0.2)", boxShadow: "0 8px 32px -4px rgba(26,25,21,0.18)" }} className="relative rounded-[18px] p-7 overflow-hidden">
      <div style={{ backgroundImage: "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.06) 1px, transparent 0)", backgroundSize: "28px 28px" }} className="absolute inset-0 pointer-events-none" />

      <div className="relative flex flex-col-reverse items-start gap-6 sm:flex-row sm:justify-between">
        <div className="flex-1 min-w-0 pt-[2px]">
          {loading ? (
            <>
              <div style={{ background: "rgba(237,232,223,0.1)", borderRadius: 6 }} className="h-[28px] w-[200px] mb-2 animate-pulse" />
              <div style={{ background: "rgba(237,232,223,0.06)", borderRadius: 6 }} className="h-4 w-[140px] animate-pulse" />
            </>
          ) : result?.played ? (
            <>
              <h1 style={{ fontFamily: "var(--font-fraunces)", color: "#EDE8DF" }} className="mb-2 font-bold text-[26px] leading-[1.15] tracking-[-0.02em]">
                You played today
              </h1>
              <div className="flex items-baseline gap-3 mt-3">
                <div style={{ fontFamily: "var(--font-fraunces)", color: "#EDE8DF" }} className="font-bold text-[54px] leading-none tracking-[-0.04em]">
                  {result.score ?? 0}
                </div>
                <div className="flex flex-col gap-[3px]">
                  {result.rank != null && (
                    <div style={{ fontFamily: "var(--font-geist-mono)", color: "#D4AF37" }} className="text-[12px] font-bold">
                      Rank #{result.rank}{result.totalPlayers != null ? ` of ${result.totalPlayers.toLocaleString()}` : ""}
                    </div>
                  )}
                  <div style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(189,200,195,0.65)" }} className="text-[11px]">
                    {result.wordsFound ?? 0} words found
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <h1 style={{ fontFamily: "var(--font-fraunces)", color: "#EDE8DF" }} className="mb-2 font-bold text-[28px] leading-[1.15] tracking-[-0.02em]">
                {"Today's board is waiting"}
              </h1>
              <div style={{ color: "rgba(189,200,195,0.7)" }} className="text-[13px]">
                Compete globally. Find the most words in 3 minutes.
                {result?.totalPlayers != null && result.totalPlayers > 0 && (
                  <span style={{ color: "rgba(212,175,55,0.75)" }} className="ml-2">
                    {result.totalPlayers.toLocaleString()} playing today.
                  </span>
                )}
              </div>
            </>
          )}

          {!loading && (
            <div className="flex items-center gap-2 mt-5 flex-wrap">
              {result?.played ? (
                <>
                  <button onClick={onStartGame} style={{ background: "#D4AF37", fontFamily: "var(--font-geist-sans)" }} className="flex items-center gap-2 px-[18px] py-[10px] text-[#111F1C] font-bold text-[13px] border-none rounded-[10px] cursor-pointer whitespace-nowrap hover:brightness-110 hover:-translate-y-px transition-all">
                    Play Again (Practice)
                  </button>
                  {result.gameId ? (
                    <Link href={`/replay/${result.gameId}`} style={{ fontFamily: "var(--font-geist-sans)" }} className="flex items-center gap-[7px] px-[18px] py-[10px] bg-white/10 text-[#EDE8DF] font-semibold text-[13px] border border-white/15 rounded-[10px] cursor-pointer whitespace-nowrap hover:bg-white/[0.16] transition-colors no-underline">
                      <Ico d={ICONS.eye} size={14} /> Review game
                    </Link>
                  ) : (
                    <button onClick={onStartGame} style={{ fontFamily: "var(--font-geist-sans)" }} className="flex items-center gap-[7px] px-[18px] py-[10px] bg-white/10 text-[#EDE8DF] font-semibold text-[13px] border border-white/15 rounded-[10px] cursor-pointer whitespace-nowrap hover:bg-white/[0.16] transition-colors">
                      <Ico d={ICONS.eye} size={14} /> Review game
                    </button>
                  )}
                </>
              ) : (
                <button onClick={onPlayDaily} style={{ background: "#D4AF37", fontFamily: "var(--font-geist-sans)" }} className="flex items-center gap-2 px-[22px] py-[12px] text-[#111F1C] font-bold text-[14px] border-none rounded-[12px] cursor-pointer whitespace-nowrap hover:brightness-110 hover:-translate-y-px transition-all">
                  Play Today&apos;s Board →
                </button>
              )}
            </div>
          )}
          {!loading && (
            <div style={{ fontFamily: "var(--font-geist-mono)", color: "rgba(212,175,55,0.78)" }} className="mt-3 text-[10px] uppercase tracking-[0.16em]">
              Daily challenge · {dateLabel}
            </div>
          )}
        </div>

        {/* Board preview — tile 46px + gap 6px = step 52px, center offset = 23px */}
        <div className="flex-shrink-0" style={{ position: "relative" }}>
          <div style={{
            background: "rgba(249,247,241,0.07)",
            border: "1px solid rgba(237,232,223,0.12)",
            borderRadius: 16,
            padding: 12,
            boxShadow: "0 8px 32px -8px rgba(0,0,0,0.35)",
            position: "relative",
          }}>
            {/* Pathfinder SVG — same stroke as real Board component */}
            {!loading && !result?.played && (
              <svg style={{ position: "absolute", inset: 12, width: "calc(100% - 24px)", height: "calc(100% - 24px)", zIndex: 0, pointerEvents: "none", overflow: "visible" }}>
                {Array.from(litEdges).map(edge => {
                  const [a, b] = edge.split("-");
                  const [r1, c1] = a.split(",").map(Number);
                  const [r2, c2] = b.split(",").map(Number);
                  return (
                    <line key={edge}
                      x1={c1 * 52 + 23} y1={r1 * 52 + 23}
                      x2={c2 * 52 + 23} y2={r2 * 52 + 23}
                      stroke="#1A3C34" strokeWidth={4} strokeLinecap="round" opacity={0.55}
                    />
                  );
                })}
              </svg>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 46px)", gap: 6, position: "relative", zIndex: 1 }}>
              {previewBoard.map((letter, i) => {
                const r = Math.floor(i / 4), c = i % 4;
                return (
                  <MiniTile
                    key={i}
                    letter={letter}
                    lit={!loading && !result?.played && litCells.has(`${r},${c}`)}
                    found={false}
                    skeleton={loading}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Quick Play Cards ──
function QuickPlayCards({ onBlitz, onRapid, onDaily }: {
  onBlitz: () => void;
  onRapid: () => void;
  onDaily: () => void;
}) {
  const modes = [
    {
      label: "Blitz",
      sub: "1 minute · Random board",
      badge: "Fast",
      badgeColor: "#9B2226",
      icon: ICONS.bolt,
      onClick: onBlitz,
      accent: "#9B2226",
    },
    {
      label: "Rapid",
      sub: "3 minutes · Random board",
      badge: "Classic",
      badgeColor: "#1A3C34",
      icon: ICONS.play,
      onClick: onRapid,
      accent: "#1A3C34",
    },
    {
      label: "Daily",
      sub: "Ranked · One per day",
      badge: "Ranked",
      badgeColor: "#D4AF37",
      icon: ICONS.trophy,
      onClick: onDaily,
      accent: "#D4AF37",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
      {modes.map((m) => (
        <button
          key={m.label}
          onClick={m.onClick}
          className="group flex flex-col gap-2 rounded-[14px] border border-cream-divider bg-parchment-raised p-4 text-left transition-all hover:border-baize hover:shadow-[0_4px_16px_-4px_rgba(26,25,21,0.12)] active:scale-[0.98]"
          style={{ boxShadow: "0 1px 3px rgba(26,25,21,0.04)" }}
        >
          <div className="flex items-center justify-between">
            <div style={{ background: `${m.accent}14`, borderRadius: 8, padding: 7 }}>
              <Ico d={m.icon} size={15} />
            </div>
            <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", background: `${m.badgeColor}15`, color: m.badgeColor, padding: "2px 6px", borderRadius: 4 }}>
              {m.badge}
            </span>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 14, fontWeight: 700, color: "var(--soft-black)" }}>{m.label}</div>
            <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10.5, color: "var(--muted-ink)", marginTop: 1 }}>{m.sub}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Stat cards ──
function StatCards({ stats, rating, loading }: { stats: UserStats | null; rating: number | null; loading: boolean }) {
  const cards = [
    { label: "Rating", value: loading ? "—" : (rating != null ? rating.toString() : "—"), sub: "ELO" },
    { label: "Games Played", value: loading ? "—" : (stats?.games_played ?? 0).toString(), sub: "all time" },
    { label: "Best Score", value: loading ? "—" : (stats?.best_net_score ?? 0).toString(), sub: "net score" },
    { label: "Day Streak", value: loading ? "—" : (stats?.current_streak ?? 0).toString(), sub: "days" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((c) => (
            <div key={c.label} className="rounded-[12px] border border-cream-divider bg-parchment-raised p-4" style={{ boxShadow: "0 1px 3px rgba(26,25,21,0.04)" }}>
          <div style={{ fontFamily: "var(--font-geist-mono)" }} className="mb-2 text-[9.5px] uppercase tracking-[0.15em] text-muted-ink">{c.label}</div>
          <div style={{ fontFamily: "var(--font-fraunces)" }} className="font-bold text-[28px] leading-none tracking-[-0.02em] text-ink-accent">{c.value}</div>
          <div style={{ fontFamily: "var(--font-geist-mono)" }} className="mt-1 text-[11px] text-muted-ink">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ── Recent games ──
function RecentGames({ games, loading }: { games: GameStatRow[]; loading: boolean }) {
  const modeBadge = (isDailyChallenge: boolean | null) => {
    if (isDailyChallenge) return { label: "Daily", cls: "bg-[rgba(45,106,79,0.1)] text-felt-green" };
    return { label: "Play", cls: "bg-[rgba(26,60,52,0.08)] text-ink-accent" };
  };

  if (loading) return <div className="py-4 text-[13px] text-muted-ink" style={{ fontFamily: "var(--font-geist-mono)" }}>Loading...</div>;

  if (games.length === 0) return (
    <div className="bg-white border border-[#E6E4DD] rounded-[14px] p-8 text-center flex flex-col items-center" style={{ boxShadow: "0 1px 3px rgba(26,25,21,0.04)" }}>
      <Engraving src="/marks/games.svg" className="h-16 w-16 mb-3 text-ink-accent opacity-55" />
      <p style={{ fontFamily: "var(--font-geist-sans)" }} className="mb-1 text-[13px] font-semibold text-ink-accent">No games yet</p>
      <p className="text-[12px] text-muted-ink">Play your first game to see your history here.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {games.map((g) => {
        const badge = modeBadge(g.is_daily_challenge);
        const wordCount = g.words_found?.length ?? 0;
        const ago = g.created_at ? timeAgo(g.created_at) : "—";
        const mins = g.duration_seconds != null ? Math.floor(g.duration_seconds / 60) : null;
        const secs = g.duration_seconds != null ? g.duration_seconds % 60 : null;
        const duration = mins != null && secs != null ? `${mins}:${secs.toString().padStart(2, "0")}` : "—";

        return (
          <Link
            key={g.id}
            href={`/replay/${g.id}`}
            className="flex items-center gap-[14px] px-4 py-[13px] bg-white border border-[#E6E4DD] rounded-[12px] hover:shadow-[0_4px_12px_-4px_rgba(26,25,21,0.1)] hover:border-[#1A3C34]/30 transition-all cursor-pointer no-underline"
            style={{ boxShadow: "0 1px 3px rgba(26,25,21,0.04)" }}
          >
            <span style={{ fontFamily: "var(--font-geist-mono)" }} className={`text-[9.5px] font-bold uppercase tracking-[0.1em] px-2 py-1 rounded-[6px] whitespace-nowrap flex-shrink-0 ${badge.cls}`}>
              {badge.label}
            </span>
            <div style={{ fontFamily: "var(--font-geist-mono)" }} className="min-w-[40px] font-bold text-[18px] text-ink-accent">
              {g.net_score ?? 0}
            </div>
            <div className="flex-1 flex flex-col gap-[2px]">
              <div style={{ fontFamily: "var(--font-geist-sans)" }} className="text-[12.5px] font-medium text-soft-black">{wordCount} words found</div>
              <div style={{ fontFamily: "var(--font-geist-mono)" }} className="text-[11px] text-muted-ink">{ago} · {duration}</div>
            </div>
            <svg className="w-3.5 h-3.5 text-[#C0C0C0] group-hover:text-[#1A3C34] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        );
      })}
    </div>
  );
}

// ── Leaderboard ──
function LeaderboardStrip({ entries, userId, loading }: { entries: LeaderboardEntry[]; userId: string; loading: boolean }) {
  const dateLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="bg-white border border-[#E6E4DD] rounded-[14px] overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(26,25,21,0.04)" }}>
      <div className="flex items-center justify-between px-[18px] py-[14px] border-b border-[#E6E4DD]">
        <h4 style={{ fontFamily: "var(--font-geist-sans)" }} className="text-[13px] font-bold text-ink-accent">{"Today's Leaderboard"}</h4>
        <span style={{ fontFamily: "var(--font-geist-mono)" }} className="text-[11px] text-muted-ink">{dateLabel}</span>
      </div>

      {loading ? (
        <div style={{ fontFamily: "var(--font-geist-mono)" }} className="px-[18px] py-8 text-center text-[12px] text-muted-ink">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="px-[18px] py-8 text-center flex flex-col items-center">
          <Engraving src="/marks/scores.svg" className="h-16 w-16 mb-3 text-ink-accent opacity-55" />
          <p style={{ fontFamily: "var(--font-geist-sans)" }} className="mb-1 text-[13px] font-semibold text-ink-accent">No scores yet today</p>
          <p className="text-[12px] text-muted-ink">Be the first to play!</p>
        </div>
      ) : (
        entries.map((r, i) => {
          const isYou = r.user_id === userId;
          const name = r.display_name || r.username || "Player";
          const color = avatarColor(r.user_id ?? String(i));
          return (
            <div key={r.user_id} className={`flex items-center gap-3 px-[18px] py-[10px] border-b border-[#E6E4DD] last:border-b-0 transition-colors ${isYou ? "bg-[rgba(212,175,55,0.12)]" : "hover:bg-[#F9F7F1]"}`}>
              <div aria-label={`Rank ${i + 1}`} style={{ fontFamily: "var(--font-geist-mono)" }} className={`w-[22px] flex-shrink-0 text-center text-[11px] font-bold ${i < 3 ? "text-brass" : "text-muted-ink"}`}>
                {MEDALS[i] ?? `#${i + 1}`}
              </div>
              <div style={{ background: color }} className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 text-[#EDE8DF]">
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div style={{ fontFamily: "var(--font-geist-sans)" }} className="flex items-center gap-1 text-[13px] font-semibold text-soft-black">
                  {name}
                  {isYou && <span style={{ fontFamily: "var(--font-geist-mono)", color: "#D4AF37" }} className="text-[10px] font-bold">YOU</span>}
                </div>
                <div style={{ fontFamily: "var(--font-geist-mono)" }} className="text-[11px] text-muted-ink">@{r.username}</div>
              </div>
              <div className="text-right">
                <div style={{ fontFamily: "var(--font-geist-mono)" }} className="font-bold text-[14px] text-ink-accent">{r.net_score}</div>
                <div style={{ fontFamily: "var(--font-geist-mono)" }} className="text-[11px] text-muted-ink">{r.words_found}w</div>
              </div>
            </div>
          );
        })
      )}
      <div className="px-[18px] py-3 text-center border-t border-[#E6E4DD] bg-[rgba(249,247,241,0.5)]">
        <Link href="/leaderboard" style={{ fontFamily: "var(--font-geist-sans)" }} className="text-[12px] font-semibold text-ink-accent no-underline hover:underline">
          View full leaderboard →
        </Link>
      </div>
    </div>
  );
}

// ── Friends panel ──
function FriendsSection({ onSendMail }: { onSendMail?: (friendId: string) => void }) {
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [addUsername, setAddUsername] = useState("");
  const [addState, setAddState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [addMsg, setAddMsg] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [fr, pr] = await Promise.all([fetch("/api/friends"), fetch("/api/friends/pending")]);
      if (fr.ok) setFriends((await fr.json()).friends ?? []);
      if (pr.ok) setPending((await pr.json()).requests ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAddFriend = async () => {
    if (!addUsername.trim()) return;
    setAddState("loading");
    try {
      const res = await fetch("/api/friends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: addUsername.trim() }) });
      const data = await res.json();
      if (res.ok) { setAddState("success"); setAddMsg(data.message ?? "Request sent!"); setAddUsername(""); }
      else { setAddState("error"); setAddMsg(data.error ?? "Failed"); }
    } catch { setAddState("error"); setAddMsg("Network error"); }
    setTimeout(() => { setAddState("idle"); setAddMsg(""); }, 3000);
  };

  const handleAccept = async (id: string) => {
    await fetch(`/api/friends/respond`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ friendship_id: id, action: "accept" }) });
    fetchAll();
  };

  const handleDecline = async (id: string) => {
    await fetch(`/api/friends/respond`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ friendship_id: id, action: "decline" }) });
    fetchAll();
  };

  const online = friends.filter(f => f.is_online);
  const offline = friends.filter(f => !f.is_online);

  return (
    <div>
      <div style={{ borderBottom: "1px solid rgba(26,25,21,0.1)", paddingBottom: 10, marginBottom: 14, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
          <span style={{ fontFamily: "var(--font-fraunces)", fontSize: 13.5, fontWeight: 700, color: "#1A1A1A", letterSpacing: "-0.01em" }}>Friends</span>
          {friends.length > 0 && (
            <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, color: "#A8A49E" }}>
              {online.length > 0 ? `${online.length} online` : friends.length}
            </span>
          )}
          {pending.length > 0 && (
            <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, fontWeight: 700, background: "#D4AF37", color: "#111F1C", borderRadius: "50%", width: 15, height: 15, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{pending.length}</span>
          )}
        </div>
        {!showAdd && (
          <button onClick={() => setShowAdd(true)} style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, color: "#A8A49E", background: "none", border: "none", cursor: "pointer", padding: 0, letterSpacing: "0.04em" }} className="hover:text-[#1A3C34] transition-colors">
            + add
          </button>
        )}
      </div>

      {showAdd && (
        <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <input
            value={addUsername}
            onChange={(e) => setAddUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddFriend()}
            placeholder="username…"
            style={{ fontFamily: "var(--font-geist-sans)", fontSize: 12, background: "rgba(26,25,21,0.04)", border: "none", borderBottom: "1px solid rgba(26,25,21,0.2)", padding: "5px 0", outline: "none", color: "#1A1A1A", width: "100%" }}
            className="placeholder:text-[#B8B4AE]"
            autoFocus
          />
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={handleAddFriend} disabled={addState === "loading"} style={{ fontFamily: "var(--font-geist-sans)", fontSize: 11, fontWeight: 700, color: "#1A3C34", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline", textUnderlineOffset: 2 }}>
              {addState === "loading" ? "Sending…" : "Send request"}
            </button>
            <button onClick={() => { setShowAdd(false); setAddState("idle"); setAddMsg(""); }} style={{ fontFamily: "var(--font-geist-sans)", fontSize: 11, color: "#A8A49E", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              cancel
            </button>
            {addMsg && <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, color: addState === "success" ? "#2D6A4F" : "#9B2226" }}>{addMsg}</span>}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.16em", color: "#A8A49E", marginBottom: 7, borderBottom: "1px solid rgba(26,25,21,0.06)", paddingBottom: 5 }}>Requests</div>
          {pending.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", padding: "5px 0", borderBottom: "1px solid rgba(26,25,21,0.05)" }}>
              <span style={{ fontFamily: "var(--font-geist-sans)", fontSize: 12, fontWeight: 600, color: "#1A1A1A", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.requester.display_name || r.requester.username}</span>
              <button onClick={() => handleAccept(r.id)} style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, fontWeight: 700, color: "#2D6A4F", background: "none", border: "none", cursor: "pointer", padding: "0 6px 0 0", textDecoration: "underline", textUnderlineOffset: 2 }}>accept</button>
              <button onClick={() => handleDecline(r.id)} style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, color: "#A8A49E", background: "none", border: "none", cursor: "pointer", padding: 0 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10, color: "#A8A49E" }}>Loading…</div>
      ) : friends.length === 0 ? (
        <div className="flex flex-col items-center py-3 text-center">
          <Engraving src="/marks/friends.svg" className="h-[60px] w-[60px] mb-2.5 text-ink-accent opacity-65" />
          <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 12, color: "#8A8A8A", lineHeight: 1.5 }}>
            No friends yet — add a few to follow their scores.
          </div>
        </div>
      ) : (
        <div>
          {online.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.16em", color: "#A8A49E", marginBottom: 6 }}>Online · {online.length}</div>
              {online.map((f) => <EditorialFriendRow key={f.user_id} friend={f} onSendMail={onSendMail} />)}
            </div>
          )}
          {offline.length > 0 && (
            <div>
              <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.16em", color: "#A8A49E", marginBottom: 6, ...(online.length > 0 ? { marginTop: 12 } : {}) }}>Offline · {offline.length}</div>
              {offline.map((f) => <EditorialFriendRow key={f.user_id} friend={f} dimmed onSendMail={onSendMail} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EditorialFriendRow({ friend, dimmed, onSendMail }: { friend: FriendRow; dimmed?: boolean; onSendMail?: (id: string) => void }) {
  const [hovering, setHovering] = useState(false);
  const name = friend.display_name || friend.username;
  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid rgba(26,25,21,0.05)", opacity: dimmed ? 0.55 : 1 }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: friend.is_online ? "#2D6A4F" : "#C8C4BE", flexShrink: 0, marginTop: 1 }} />
      <span style={{ fontFamily: "var(--font-geist-sans)", fontSize: 12.5, fontWeight: 600, color: "#1A1A1A", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
      {hovering && onSendMail ? (
        <button
          onClick={() => onSendMail(friend.user_id)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#1A3C34", padding: "0 2px", display: "flex", alignItems: "center" }}
          title="Send Moggle Mail"
        >
          <TbSend style={{ width: 13, height: 13 }} />
        </button>
      ) : (
        <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 10.5, color: "#A8A49E" }}>{friend.rating}</span>
      )}
    </div>
  );
}

// ── Play Mode Modal ──
function PlayModeModal({ onClose, onSingleplayer, onMultiplayer, onPractice }: {
  onClose: () => void;
  onSingleplayer: () => void;
  onMultiplayer: () => void;
  onPractice: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,20,16,0.72)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose a mode"
        className="bg-parchment relative"
        style={{ borderRadius: 20, padding: "36px 32px", width: 460, maxWidth: "90vw", boxShadow: "0 24px 64px -8px rgba(15,20,16,0.35)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border-none bg-transparent text-muted-ink transition-colors hover:bg-[rgba(26,25,21,0.06)] hover:text-soft-black"
        >
          <TbX size={18} />
        </button>
        <div style={{ fontFamily: "var(--font-fraunces)", fontSize: 22, fontWeight: 700, color: "#1A1A1A", marginBottom: 4, letterSpacing: "-0.02em" }}>Choose a Mode</div>
        <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 13, color: "#8A8A8A", marginBottom: 24 }}>Pick how you want to play today.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <button
            onClick={onSingleplayer}
            style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", background: "#1A3C34", border: "none", borderRadius: 14, cursor: "pointer", textAlign: "left", width: "100%" }}
            className="hover:brightness-110 transition-all"
          >
            <TbPlayerPlay size={22} style={{ color: "#D4AF37", flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 14, fontWeight: 700, color: "#EDE8DF" }}>Singleplayer</div>
              <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 12, color: "rgba(237,232,223,0.5)", marginTop: 2 }}>Blitz, Rapid, or Daily Challenge</div>
            </div>
          </button>
          <button
            onClick={onPractice}
            style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", border: "1px solid rgba(26,25,21,0.1)", borderRadius: 14, cursor: "pointer", textAlign: "left", width: "100%" }}
            className="bg-parchment-sunk hover:brightness-95 transition-all"
          >
            <TbBrain size={22} style={{ color: "#1A3C34", flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>Practice</div>
              <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 12, color: "#8A8A8A", marginTop: 2 }}>Microboards, Zen Mode — no pressure</div>
            </div>
          </button>
          <button
            onClick={onMultiplayer}
            style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", border: "1px solid rgba(26,25,21,0.1)", borderRadius: 14, cursor: "pointer", textAlign: "left", width: "100%" }}
            className="bg-parchment-sunk hover:brightness-95 transition-all"
          >
            <TbUsers size={22} style={{ color: "#1A3C34", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-geist-sans)", fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>Multiplayer</span>
                <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", background: "#D4AF37", color: "#111F1C", padding: "2px 5px", borderRadius: 4 }}>Beta</span>
              </div>
              <div style={{ fontFamily: "var(--font-geist-sans)", fontSize: 12, color: "#8A8A8A", marginTop: 2 }}>Challenge friends, live matches</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main account view ──
export interface DashboardProps {
  user: User;
  initialActive?: string;
  onPlayDaily: () => void;
  onStartGame: () => void;
  onStartBlitz: () => void;
  onStartRapid: () => void;
  onStartZen: () => void;
  onStartMultiplayer: () => void;
  onStartPractice: () => void;
  onSignOut: () => void;
}

export function Dashboard({ user, initialActive = "daily", onPlayDaily, onStartGame, onStartBlitz, onStartRapid, onStartZen, onStartMultiplayer, onStartPractice, onSignOut }: DashboardProps) {
  const [active, setActive] = useState(initialActive);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showPlayModal, setShowPlayModal] = useState(false);
  const [showMail, setShowMail] = useState(initialActive === "mail");
  const [mailUnread, setMailUnread] = useState(0);
  const [mailFriends, setMailFriends] = useState<FriendRow[]>([]);

  const [rating, setRating] = useState<number | null>(null);
  const [games, setGames] = useState<GameStatRow[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(true);
  // Stats for stat cards
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    supabase.from("user_ratings").select("rating").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setRating(data?.rating ?? null));
  }, [user.id]);

  useEffect(() => {
    async function loadGames() {
      setGamesLoading(true);
      const { data } = await supabase
        .from("game_stats")
        .select("id, net_score, gross_score, words_found, created_at, duration_seconds, is_daily_challenge")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setGames(data ?? []);
      setGamesLoading(false);
    }
    loadGames();
  }, [user.id]);

  useEffect(() => {
    getTodaysLeaderboard(8).then((data) => {
      setLeaderboard(data);
      setLbLoading(false);
    });
  }, []);

  useEffect(() => {
    fetch("/api/stats/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.stats) setStats({
          games_played: data.stats.games_played,
          best_net_score: data.stats.best_net_score,
          current_streak: data.stats.current_streak,
        });
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  // Poll mail unread count + load friends for mail compose
  useEffect(() => {
    const loadMailData = async () => {
      try {
        const [mailRes, friendsRes] = await Promise.all([
          fetch("/api/mail"),
          fetch("/api/friends"),
        ]);
        if (mailRes.ok) {
          const { mails } = await mailRes.json();
          const unread = (mails ?? []).filter((m: { recipient_id: string; recipient_played_at: string | null }) => m.recipient_id === user.id && !m.recipient_played_at).length;
          setMailUnread(unread);
        }
        if (friendsRes.ok) {
          const { friends } = await friendsRes.json();
          setMailFriends(friends ?? []);
        }
      } catch { /* silent */ }
    };
    loadMailData();
    const interval = setInterval(loadMailData, 60_000);
    return () => clearInterval(interval);
  }, [user.id]);

  const handleNav = (id: string) => {
    setActive(id);
    if (id === "mail") { setShowMail(true); return; }
    setShowMail(false);
    if (id === "daily") { onPlayDaily(); return; }
    if (id === "blitz") { setShowPlayModal(false); onStartBlitz(); return; }
    if (id === "rapid") { setShowPlayModal(false); onStartRapid(); return; }
    if (id === "singleplayer") { setShowPlayModal(true); return; }
    if (["live-mp", "friends-mp"].includes(id)) { onStartMultiplayer(); return; }
    if (id === "zen") { onStartZen(); return; }
    if (["micro"].includes(id)) { onStartPractice(); return; }
  };

  return (
    <>
      <div className="min-h-full bg-parchment text-soft-black">
            {showMail ? (
              <div style={{ height: "100%", overflow: "hidden" }}>
                <MoggleMailView
                  user={user}
                  friends={mailFriends}
                  onClose={() => { setShowMail(false); setActive("daily"); }}
                />
              </div>
            ) : (
              <div className="px-4 py-6 pb-16 sm:px-8 sm:py-8 flex flex-col lg:flex-row gap-8 max-w-[1140px] w-full mx-auto items-start">

                <div className="flex-1 min-w-0 flex flex-col gap-0">
                  <DailyHero
                    userId={user.id}
                    onPlayDaily={onPlayDaily}
                    onStartGame={onStartGame}
                  />

                  <QuickPlayCards onBlitz={onStartBlitz} onRapid={onStartRapid} onDaily={onPlayDaily} />

                  <div style={{ borderTop: "1px solid rgba(26,25,21,0.08)", margin: "24px 0" }} />

                  <StatCards stats={stats} rating={rating} loading={statsLoading} />

                  <div style={{ borderTop: "1px solid rgba(26,25,21,0.08)", margin: "24px 0 16px" }} />

                  <div className="flex flex-col gap-6">
                    <div>
                      <div className="flex items-center gap-4 mb-3">
                        <h3 style={{ fontFamily: "var(--font-fraunces)" }} className="flex-shrink-0 text-[18px] font-semibold text-soft-black">Recent Games</h3>
                        <div className="h-px flex-1 bg-cream-divider" />
                      </div>
                      <RecentGames games={games} loading={gamesLoading} />
                    </div>

                    <div>
                      <div className="flex items-center gap-4 mb-3">
                        <h3 style={{ fontFamily: "var(--font-fraunces)" }} className="flex-shrink-0 text-[18px] font-semibold text-soft-black">{"Today's Leaderboard"}</h3>
                        <div className="h-px flex-1 bg-cream-divider" />
                      </div>
                      <LeaderboardStrip entries={leaderboard} userId={user.id} loading={lbLoading} />
                    </div>
                  </div>
                </div>

                <div className="w-full flex-shrink-0 border-t border-[rgba(26,25,21,0.09)] pt-6 lg:w-[200px] lg:self-start lg:sticky lg:top-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
                  <FriendsSection onSendMail={(friendId) => {
                    const f = mailFriends.find(fr => fr.user_id === friendId);
                    if (f) { setShowMail(true); setActive("mail"); }
                  }} />
                </div>

              </div>
            )}
      </div>

      {showPlayModal && (
        <PlayModeModal
          onClose={() => setShowPlayModal(false)}
          onSingleplayer={() => {
            setShowPlayModal(false);
            onStartGame();
          }}
          onMultiplayer={() => {
            setShowPlayModal(false);
            onStartMultiplayer();
          }}
          onPractice={() => {
            setShowPlayModal(false);
            onStartPractice();
          }}
        />
      )}
    </>
  );
}
