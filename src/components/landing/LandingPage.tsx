"use client";

import { useState, useEffect } from "react";
import type { IconType } from "react-icons";
import { TbBolt, TbPlayerPlay, TbLayoutGrid, TbMoon, TbPuzzle, TbLock, TbArrowRight } from "react-icons/tb";
import { AuthModal } from "@/components/auth/AuthModal";
import { AppShell } from "@/components/layout/AppShell";
import { Engraving } from "@/components/shared/Engraving";
import { getTodaysLeaderboard } from "@/lib/supabase/leaderboard";
import { getReducedMotionEnabled } from "@/lib/preferences";
import type { LeaderboardEntry } from "@/lib/supabase/client";
import type { User } from "@/lib/supabase/client";

// ── Animated demo board ──
const BOARD = [
  ["S", "T", "R", "E"],
  ["O", "A", "N", "I"],
  ["W", "L", "D", "G"],
  ["P", "E", "B", "T"],
];

const WORD_PATHS = [
  new Set(["0,0", "0,1", "0,2", "1,0", "1,1"]),
  new Set(["0,3", "1,3", "1,2", "2,2"]),
  new Set(["3,1", "2,1", "1,1", "0,1", "0,0"]),
];

const AV_COLORS = [
  "#1A3C34", "#2D6A4F", "#9B2226", "#5C4033", "#6B4F9E", "#1A5B8A", "#7A3F00",
];

// ── Daily Hero ──
function DailyHero({ onPlay }: { onPlay: () => void }) {
  const [litIdx, setLitIdx] = useState(0);
  useEffect(() => {
    // Honor reduced motion: leave a single static lit path instead of cycling.
    if (getReducedMotionEnabled()) return;
    const t = setInterval(() => setLitIdx((i) => (i + 1) % WORD_PATHS.length), 1400);
    return () => clearInterval(t);
  }, []);
  const lit = WORD_PATHS[litIdx];
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #1A3C34 0%, #0F2016 60%, #162E20 100%)",
        border: "1px solid rgba(212,175,55,0.2)",
        boxShadow: "0 8px 32px -4px rgba(26,25,21,0.18)",
      }}
      className="relative overflow-hidden rounded-[18px] p-6 sm:p-7"
    >
      <div style={{ backgroundImage: "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.07) 1px, transparent 0)", backgroundSize: "28px 28px" }} className="pointer-events-none absolute inset-0" />

      <div className="relative flex flex-col-reverse items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div style={{ fontFamily: "var(--font-geist-mono)", color: "#D4AF37" }} className="mb-[10px] text-[10px] uppercase tracking-[0.2em] opacity-85">
            Daily Challenge · {today}
          </div>
          <div style={{ fontFamily: "var(--font-fraunces)", color: "#EDE8DF" }} className="mb-[6px] text-[26px] font-bold leading-[1.15] tracking-[-0.02em]">
            {"Today's Moggle Board"}
          </div>
          <div style={{ color: "rgba(189,200,195,0.75)" }} className="mt-[5px] text-[13px]">
            Compete globally. Find the most words in 3 minutes.
          </div>
          <button
            onClick={onPlay}
            style={{ background: "#D4AF37", boxShadow: "0 4px 14px -2px rgba(212,175,55,0.4)", fontFamily: "var(--font-geist-sans)" }}
            className="mt-5 flex items-center gap-2 whitespace-nowrap rounded-[12px] border-none px-[22px] py-[13px] text-[13.5px] font-bold text-baize-deep transition-all hover:-translate-y-px hover:brightness-110 active:scale-[0.97]"
          >
            Play Daily Challenge
          </button>
        </div>

        <div className="flex flex-shrink-0 flex-col items-end gap-[10px]">
          <div className="grid grid-cols-4 gap-[5px]">
            {BOARD.map((row, r) =>
              row.map((letter, c) => {
                const isLit = lit.has(`${r},${c}`);
                return (
                  <div
                    key={`${r},${c}`}
                    style={{
                      width: 40, height: 40,
                      fontFamily: "var(--font-fraunces)",
                      background: isLit ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.08)",
                      border: isLit ? "1px solid rgba(212,175,55,0.5)" : "1px solid rgba(255,255,255,0.1)",
                      color: isLit ? "#D4AF37" : "#EDE8DF",
                      boxShadow: isLit
                        ? "2px 2px 0 0 rgba(0,0,0,0.2), 0 0 8px rgba(212,175,55,0.2)"
                        : "2px 2px 0 0 rgba(0,0,0,0.2), inset 0 -2px 0 rgba(0,0,0,0.15)",
                      transition: "all 200ms",
                    }}
                    className="flex items-center justify-center rounded-[7px] text-[17px] font-bold"
                  >
                    {letter}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Game modes — tiered hierarchy, not an identical 6-card grid ──
interface FreeMode {
  Icon: IconType;
  title: string;
  desc: string;
  tag: string;
  iconClass: string;
}
interface LockedMode {
  Icon: IconType;
  title: string;
  desc: string;
  tag: string;
}

// The two instantly-playable modes get prominence. (Daily lives in the hero above.)
const FREE_MODES: FreeMode[] = [
  { Icon: TbBolt, title: "Blitz", desc: "One minute. Maximum speed. Find every word you can.", tag: "1 min", iconClass: "bg-[rgba(212,175,55,0.14)] text-[#A88A1A]" },
  { Icon: TbPlayerPlay, title: "Rapid", desc: "Three minutes of focused, unhurried word hunting.", tag: "3 min", iconClass: "bg-[rgba(26,60,52,0.08)] text-ink-accent" },
];

// Everything still behind sign-up is demoted to a compact list — not equal cards.
const LOCKED_MODES: LockedMode[] = [
  { Icon: TbLayoutGrid, title: "Microboards", desc: "Bite-sized 3×3 puzzles for quick practice.", tag: "Practice" },
  { Icon: TbMoon, title: "Zen Mode", desc: "No timer, no pressure — play at your pace.", tag: "Practice" },
  { Icon: TbPuzzle, title: "Puzzles", desc: "Find the one hidden word on each special board.", tag: "New" },
];

function QuickPlayCard({ mode, onPlay }: { mode: FreeMode; onPlay: () => void }) {
  return (
    <button
      onClick={onPlay}
      style={{ boxShadow: "0 1px 3px rgba(26,25,21,0.04)" }}
      className="group flex items-center gap-4 rounded-[14px] border border-cream-divider bg-parchment-raised p-5 text-left transition-all duration-150 hover:-translate-y-[2px] hover:border-[rgba(26,60,52,0.25)] hover:shadow-[0_6px_22px_-6px_rgba(26,25,21,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-baize active:scale-[0.99]"
    >
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[12px] ${mode.iconClass}`}>
        <mode.Icon size={24} strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 style={{ fontFamily: "var(--font-geist-sans)" }} className="text-[15px] font-bold tracking-[-0.01em] text-ink-accent">
            {mode.title}
          </h4>
          <span style={{ fontFamily: "var(--font-geist-mono)" }} className="rounded-[5px] bg-[rgba(45,106,79,0.1)] px-[6px] py-[2px] text-[9px] font-semibold uppercase tracking-[0.1em] text-[#2D6A4F]">
            {mode.tag}
          </span>
        </div>
        <p className="m-0 mt-1 text-[12.5px] leading-[1.4] text-muted-ink">{mode.desc}</p>
      </div>
      <TbArrowRight size={18} className="flex-shrink-0 text-muted-stone transition-all duration-150 group-hover:translate-x-1 group-hover:text-ink-accent" />
    </button>
  );
}

function LockedModeRow({ mode, onSignUp }: { mode: LockedMode; onSignUp: () => void }) {
  return (
    <button
      onClick={onSignUp}
      className="group flex w-full items-center gap-3 rounded-[12px] border border-cream-divider bg-parchment-raised/60 px-4 py-[11px] text-left transition-colors duration-150 hover:bg-parchment-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-baize"
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[9px] bg-parchment-sunk text-muted-ink">
        <mode.Icon size={17} strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: "var(--font-geist-sans)" }} className="text-[13px] font-semibold text-soft-black">
            {mode.title}
          </span>
          <span style={{ fontFamily: "var(--font-geist-mono)" }} className="rounded-[4px] bg-[rgba(26,60,52,0.08)] px-[5px] py-[1px] text-[8.5px] font-semibold uppercase tracking-[0.1em] text-ink-accent">
            {mode.tag}
          </span>
        </div>
        <p className="m-0 truncate text-[11.5px] text-muted-ink">{mode.desc}</p>
      </div>
      <span style={{ fontFamily: "var(--font-geist-sans)" }} className="flex flex-shrink-0 items-center gap-[5px] text-[11px] font-medium text-muted-ink transition-colors group-hover:text-ink-accent">
        <TbLock size={13} /> Sign up
      </span>
    </button>
  );
}

// ── Leaderboard strip (real data) ──
const MEDALS = ["🥇", "🥈", "🥉"];

function LeaderboardStrip() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTodaysLeaderboard(5).then((data) => {
      setEntries(data);
      setLoading(false);
    });
  }, []);

  const dateLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="overflow-hidden rounded-[14px] border border-cream-divider bg-parchment-raised" style={{ boxShadow: "0 1px 3px rgba(26,25,21,0.04)" }}>
      <div className="flex items-center justify-between border-b border-cream-divider px-[18px] py-[14px]">
        <h4 style={{ fontFamily: "var(--font-geist-sans)" }} className="text-[13px] font-bold text-ink-accent">
          {"Today's Leaderboard"}
        </h4>
        <span style={{ fontFamily: "var(--font-geist-mono)" }} className="text-[11px] text-muted-ink">
          {dateLabel}
        </span>
      </div>

      {loading ? (
        <div className="px-[18px] py-8 text-center text-[12px] text-muted-ink" style={{ fontFamily: "var(--font-geist-mono)" }}>
          Loading...
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center px-[18px] py-8 text-center">
          <Engraving src="/marks/scores.svg" className="mb-3 h-16 w-16 text-ink-accent opacity-55" />
          <p style={{ fontFamily: "var(--font-geist-sans)" }} className="mb-1 text-[13px] font-semibold text-ink-accent">
            No scores yet today
          </p>
          <p className="text-[12px] text-muted-ink">Be the first to play the daily challenge!</p>
        </div>
      ) : (
        entries.map((r, i) => {
          const initials = (r.display_name || r.username || "?").slice(0, 1).toUpperCase();
          const color = AV_COLORS[i % AV_COLORS.length];
          return (
            <div key={r.user_id} className="flex items-center gap-3 border-b border-cream-divider px-[18px] py-[10px] transition-colors last:border-b-0 hover:bg-parchment">
              <div style={{ fontFamily: "var(--font-geist-mono)" }} className="w-[22px] flex-shrink-0 text-center text-[11px] text-muted-ink">
                {MEDALS[i] ?? `#${i + 1}`}
              </div>
              <div style={{ background: color }} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-cream-ink">
                {initials}
              </div>
              <div className="flex-1">
                <div style={{ fontFamily: "var(--font-geist-sans)" }} className="text-[13px] font-semibold text-soft-black">
                  {r.display_name || r.username}
                </div>
                <div style={{ fontFamily: "var(--font-geist-mono)" }} className="text-[11px] text-muted-ink">
                  @{r.username}
                </div>
              </div>
              <div style={{ fontFamily: "var(--font-geist-mono)" }} className="text-[14px] font-bold text-ink-accent">
                {r.net_score}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Main landing page — rendered inside the unified AppShell (guest mode) ──
interface LandingPageProps {
  onAuthSuccess: (user: User) => void;
  authMessage?: string;
}

export function LandingPage({ onAuthSuccess, authMessage = "" }: LandingPageProps) {
  const [showAuth, setShowAuth] = useState(Boolean(authMessage));
  const [authMode, setAuthMode] = useState<"signup" | "signin">(authMessage ? "signin" : "signup");

  const openAuth = (mode: "signup" | "signin" = "signup") => {
    setAuthMode(mode);
    setShowAuth(true);
  };

  return (
    <>
      <AppShell user={null} onAuth={openAuth}>
        <div className="mx-auto flex w-full max-w-[860px] flex-col gap-6 px-4 py-6 sm:px-7 sm:py-7">
          <div className="rise-in" style={{ "--i": 0 } as React.CSSProperties}>
            <DailyHero onPlay={() => openAuth("signup")} />
          </div>

          <div className="rise-in" style={{ "--i": 1 } as React.CSSProperties}>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 style={{ fontFamily: "var(--font-fraunces)" }} className="text-[18px] font-semibold text-soft-black">
                Quick Play
              </h3>
              <span style={{ fontFamily: "var(--font-geist-mono)" }} className="text-[11px] uppercase tracking-[0.12em] text-muted-ink">
                Free to play
              </span>
            </div>
            <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
              {FREE_MODES.map((mode) => (
                <QuickPlayCard key={mode.title} mode={mode} onPlay={() => openAuth("signup")} />
              ))}
            </div>
          </div>

          <div className="rise-in" style={{ "--i": 2 } as React.CSSProperties}>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 style={{ fontFamily: "var(--font-fraunces)" }} className="text-[18px] font-semibold text-soft-black">
                More ways to play
              </h3>
              <button
                onClick={() => openAuth("signup")}
                style={{ fontFamily: "var(--font-geist-sans)" }}
                className="border-none bg-transparent text-[12px] text-muted-ink transition-colors hover:text-ink-accent"
              >
                Sign up to unlock all →
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {LOCKED_MODES.map((mode) => (
                <LockedModeRow key={mode.title} mode={mode} onSignUp={() => openAuth("signup")} />
              ))}
            </div>
          </div>

          <div className="rise-in" style={{ "--i": 3 } as React.CSSProperties}>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 style={{ fontFamily: "var(--font-fraunces)" }} className="text-[18px] font-semibold text-soft-black">
                Leaderboard
              </h3>
            </div>
            <LeaderboardStrip />
          </div>
        </div>
      </AppShell>

      {showAuth && (
        <AuthModal
          isOpen={showAuth}
          initialMode={authMode}
          initialInfoMessage={authMessage}
          onClose={() => setShowAuth(false)}
          onAuthSuccess={(user) => {
            setShowAuth(false);
            onAuthSuccess(user);
          }}
        />
      )}
    </>
  );
}
