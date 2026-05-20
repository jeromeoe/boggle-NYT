"use client";

import { useState, useEffect } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { getTodaysLeaderboard } from "@/lib/supabase/leaderboard";
import type { LeaderboardEntry } from "@/lib/supabase/client";
import type { User } from "@/lib/supabase/client";

// ── SVG icon helper ──
function Ico({ d, size = 18 }: { d: string | string[]; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {Array.isArray(d)
        ? d.map((p, i) => <path key={i} d={p} />)
        : <path d={d} />}
    </svg>
  );
}

const ICONS = {
  play: "M5 3l14 9-14 9V3z",
  users: [
    "M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zM8 13c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zM16 13c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  ],
  brain: [
    "M9.5 2a4.5 4.5 0 0 1 4.5 4.5v3a4.5 4.5 0 0 1-9 0V6.5A4.5 4.5 0 0 1 9.5 2z",
    "M9 14c0 2 2 3 4 3s4-1 4-3",
  ],
  trophy: [
    "M8 21h8M12 17v4",
    "M17 4h3v3a4 4 0 0 1-4 4M7 4H4v3a4 4 0 0 0 4 4M7 4v6a5 5 0 0 0 10 0V4z",
  ],
  lock: [
    "M5 11a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8z",
    "M8 11V7a4 4 0 0 1 8 0v4",
  ],
  globe: [
    "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z",
    "M2 12h20",
    "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
  ],
  lightning: "M13 2L4.5 13.5H11L10 22l8.5-11.5H13L14 2z",
  puzzle:
    "M2 12.5V20h7.5v-3.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V20H20v-7.5h-3.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5H20V2h-7.5v3.5c0 .83-.67 1.5-1.5 1.5S9.5 6.33 9.5 5.5V2H2v7.5h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5H2z",
  zen: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v4l3 3",
  grid4: ["M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"],
};

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

// ── Sidebar ──
function Sidebar({ onAuth }: { onAuth: (mode: "signup" | "signin") => void }) {
  const [playOpen, setPlayOpen] = useState(true);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [active, setActive] = useState("blitz");

  return (
    <aside
      style={{ width: 240, background: "#111F1C" }}
      className="flex-shrink-0 flex flex-col overflow-hidden border-r border-white/[0.06]"
    >
      <div className="px-[18px] pt-5 pb-[14px] border-b border-white/[0.07] flex items-center gap-[10px] flex-shrink-0">
        <div
          style={{ fontFamily: "var(--font-fraunces)", color: "#EDE8DF" }}
          className="font-bold text-[19px] tracking-[-0.03em]"
        >
          MOGGLE<span style={{ color: "#D4AF37" }}>.ORG</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-[10px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mb-1">
          <SectionLabel>Play</SectionLabel>
          <SidebarItem icon="play" label="Singleplayer" isGroup open={playOpen} onToggle={() => setPlayOpen(!playOpen)} />
          <div
            className="overflow-hidden transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ maxHeight: playOpen ? 200 : 0, opacity: playOpen ? 1 : 0 }}
          >
            <SubItem id="blitz" label="Blitz" badge="1 min" active={active} onSelect={setActive} />
            <SubItem id="rapid" label="Rapid" badge="3 min" active={active} onSelect={setActive} />
            <SubItem id="daily" label="Daily Challenge" active={active} onSelect={setActive} />
          </div>
          <SidebarItem icon="users" label="Multiplayer" isGroup open={false} onToggle={() => {}} badge="Beta" />
          <div style={{ maxHeight: 120 }} className="overflow-hidden">
            <SubItem id="live-mp" label="Live Multiplayer" locked active={active} onSelect={setActive} />
            <SubItem id="friends-mp" label="Friends Match" locked active={active} onSelect={setActive} />
          </div>
        </div>

        <div className="mb-1">
          <SectionLabel>Practice</SectionLabel>
          <SidebarItem icon="brain" label="Practice" isGroup open={practiceOpen} onToggle={() => setPracticeOpen(!practiceOpen)} />
          <div
            className="overflow-hidden transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ maxHeight: practiceOpen ? 200 : 0, opacity: practiceOpen ? 1 : 0 }}
          >
            <SubItem id="micro" label="Microboards" active={active} onSelect={setActive} />
            <SubItem id="zen" label="Zen Mode" active={active} onSelect={setActive} />
            <SubItem id="puzzles" label="Puzzles" badge="New" active={active} onSelect={setActive} />
          </div>
        </div>

        <div className="mb-1">
          <SectionLabel>Community</SectionLabel>
          <SidebarItem icon="trophy" label="Leaderboard" onToggle={() => {}} />
          <SidebarItem icon="globe" label="Rankings" locked onToggle={() => {}} />
        </div>
      </nav>

      <div className="p-[14px] border-t border-white/[0.07] flex-shrink-0 flex flex-col gap-2">
        <button
          onClick={() => onAuth("signup")}
          style={{ boxShadow: "0 4px 12px -2px rgba(212,175,55,0.35)" }}
          className="flex items-center justify-center gap-2 px-4 py-[11px] bg-[#D4AF37] text-[#111F1C] font-bold text-[13px] rounded-[10px] border-none cursor-pointer hover:brightness-110 transition-all"
        >
          Create Free Account
        </button>
        <button
          onClick={() => onAuth("signin")}
          className="flex items-center justify-center px-4 py-[9px] bg-white/[0.06] text-[rgba(237,232,223,0.7)] text-[13px] font-medium border border-white/10 rounded-[10px] cursor-pointer hover:bg-white/10 hover:text-[#EDE8DF] transition-all"
        >
          Sign In
        </button>
      </div>
    </aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ fontFamily: "var(--font-geist-mono)" }}
      className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/25 px-[18px] pt-[10px] pb-1"
    >
      {children}
    </div>
  );
}

function SidebarItem({
  icon, label, badge, isGroup, open, onToggle, locked,
}: {
  icon: keyof typeof ICONS;
  label: string;
  badge?: string;
  isGroup?: boolean;
  open?: boolean;
  onToggle: () => void;
  locked?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-[10px] px-[18px] py-[9px] text-[rgba(237,232,223,0.6)] text-[13px] font-medium w-full text-left border-none bg-transparent cursor-pointer hover:text-[#EDE8DF] hover:bg-white/5 transition-all"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <span className="w-[18px] h-[18px] flex-shrink-0 opacity-70">
        <Ico d={ICONS[icon]} size={17} />
      </span>
      <span>{label}</span>
      {badge && (
        <span
          style={{ fontFamily: "var(--font-geist-mono)" }}
          className="ml-auto text-[9px] font-bold uppercase tracking-[0.1em] bg-[#D4AF37] text-[#111F1C] px-[6px] py-[2px] rounded-full"
        >
          {badge}
        </span>
      )}
      {locked && (
        <span className="ml-auto opacity-30 w-[13px] h-[13px]">
          <Ico d={ICONS.lock} size={13} />
        </span>
      )}
      {isGroup && (
        <svg
          style={{
            marginLeft: badge ? 0 : "auto",
            width: 14, height: 14, opacity: 0.4,
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 150ms",
          }}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      )}
    </button>
  );
}

function SubItem({
  id, label, badge, locked, active, onSelect,
}: {
  id: string; label: string; badge?: string; locked?: boolean;
  active: string; onSelect: (id: string) => void;
}) {
  const isActive = active === id;
  return (
    <button
      onClick={() => !locked && onSelect(id)}
      className={`flex items-center gap-2 py-[7px] pl-[42px] pr-[18px] text-[12.5px] w-full text-left border-none bg-transparent cursor-pointer transition-all ${
        isActive
          ? "text-[#EDE8DF]"
          : "text-[rgba(237,232,223,0.42)] hover:text-[rgba(237,232,223,0.8)] hover:bg-white/[0.04]"
      }`}
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <span className={`w-[5px] h-[5px] rounded-full flex-shrink-0 ${isActive ? "bg-[#D4AF37]" : "bg-[rgba(237,232,223,0.25)]"}`} />
      <span>{label}</span>
      {badge && !locked && (
        <span
          style={{ fontFamily: "var(--font-geist-mono)", background: "rgba(212,175,55,0.15)", color: "#D4AF37" }}
          className="ml-auto text-[9px] px-[5px] py-[2px] rounded-[4px]"
        >
          {badge}
        </span>
      )}
      {locked && (
        <span className="ml-auto opacity-25 w-[11px] h-[11px]">
          <Ico d={ICONS.lock} size={11} />
        </span>
      )}
    </button>
  );
}

// ── Daily Hero ──
function DailyHero({ onPlay }: { onPlay: () => void }) {
  const [litIdx, setLitIdx] = useState(0);
  useEffect(() => {
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
      className="relative rounded-[18px] p-7 overflow-hidden"
    >
      <div style={{ background: "linear-gradient(to right, transparent, #D4AF37 40%, #D4AF37 60%, transparent)" }} className="absolute top-0 left-0 right-0 h-[2px]" />
      <div style={{ backgroundImage: "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.07) 1px, transparent 0)", backgroundSize: "28px 28px" }} className="absolute inset-0 pointer-events-none" />
      <div style={{ background: "radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)" }} className="absolute -right-10 -top-10 w-[300px] h-[300px] pointer-events-none" />

      <div className="relative flex items-center justify-between gap-6">
        <div className="flex-1">
          <div style={{ fontFamily: "var(--font-geist-mono)", color: "#D4AF37" }} className="text-[10px] uppercase tracking-[0.2em] mb-[10px] opacity-85">
            Daily Challenge · {today}
          </div>
          <div style={{ fontFamily: "var(--font-fraunces)", color: "#EDE8DF" }} className="font-bold text-[26px] tracking-[-0.02em] leading-[1.15] mb-[6px]">
            {"Today's Moggle Board"}
          </div>
          <div style={{ color: "rgba(189,200,195,0.75)" }} className="text-[13px] mt-[5px]">
            Compete globally. Find the most words in 3 minutes.
          </div>
        </div>

        <div className="flex flex-col items-end gap-[10px] flex-shrink-0">
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
                    className="flex items-center justify-center rounded-[7px] font-bold text-[17px]"
                  >
                    {letter}
                  </div>
                );
              })
            )}
          </div>
          <button
            onClick={onPlay}
            style={{ background: "#D4AF37", boxShadow: "0 4px 14px -2px rgba(212,175,55,0.4)", fontFamily: "var(--font-geist-sans)" }}
            className="flex items-center gap-2 px-[22px] py-[13px] text-[#111F1C] font-bold text-[13.5px] border-none rounded-[12px] cursor-pointer whitespace-nowrap hover:brightness-110 hover:-translate-y-px active:scale-[0.97] transition-all"
          >
            Play Daily Challenge
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mode cards ──
const MODES = [
  { icon: "lightning" as keyof typeof ICONS, iconStyle: "gold", title: "Blitz", desc: "1 minute. Maximum speed. Find every word you can.", tag: "Free", tagStyle: "free", locked: false },
  { icon: "play" as keyof typeof ICONS, iconStyle: "", title: "Rapid", desc: "3 minutes of focused word hunting.", tag: "Free", tagStyle: "free", locked: false },
  { icon: "trophy" as keyof typeof ICONS, iconStyle: "gold", title: "Daily Challenge", desc: "Compete on today's shared board with the world.", tag: "Ranked", tagStyle: "ranked", locked: false },
  { icon: "grid4" as keyof typeof ICONS, iconStyle: "green", title: "Microboards", desc: "Bite-sized 3×3 puzzles for quick practice sessions.", tag: "Practice", tagStyle: "beta", locked: true },
  { icon: "zen" as keyof typeof ICONS, iconStyle: "", title: "Zen Mode", desc: "No timer. No pressure. Explore the board at your pace.", tag: "Practice", tagStyle: "beta", locked: true },
  { icon: "puzzle" as keyof typeof ICONS, iconStyle: "green", title: "Puzzles", desc: "Find the one hidden word on each special board.", tag: "New", tagStyle: "ranked", locked: true },
];

function ModeCard({ mode, onSignUp }: { mode: (typeof MODES)[number]; onSignUp: () => void }) {
  const iconBg: Record<string, string> = {
    gold: "bg-[rgba(212,175,55,0.12)] text-[#D4AF37]",
    green: "bg-[rgba(45,106,79,0.12)] text-[#2D6A4F]",
    "": "bg-[rgba(26,60,52,0.07)] text-[#1A3C34]",
  };
  const tagBg: Record<string, string> = {
    free: "bg-[rgba(45,106,79,0.1)] text-[#2D6A4F]",
    ranked: "bg-[rgba(212,175,55,0.12)] text-[#A88A1A]",
    beta: "bg-[rgba(26,60,52,0.08)] text-[#1A3C34]",
  };

  return (
    <div
      className={`relative bg-white border border-[#E6E4DD] rounded-[14px] p-[18px] flex flex-col gap-[10px] overflow-hidden transition-all duration-150 ${
        mode.locked ? "cursor-default" : "cursor-pointer hover:shadow-[0_4px_20px_-4px_rgba(26,25,21,0.12)] hover:-translate-y-[2px] hover:border-[rgba(26,60,52,0.2)]"
      }`}
      style={{ boxShadow: "0 1px 3px rgba(26,25,21,0.04)" }}
    >
      <div className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center ${iconBg[mode.iconStyle]}`}>
        <Ico d={ICONS[mode.icon]} size={20} />
      </div>
      <div>
        <h4 style={{ fontFamily: "var(--font-geist-sans)" }} className="font-bold text-[14px] text-[#1A3C34] tracking-[-0.01em]">
          {mode.title}
        </h4>
        <p className="text-[12px] text-[#8A8A8A] leading-[1.4] mt-1 m-0">{mode.desc}</p>
      </div>
      <span style={{ fontFamily: "var(--font-geist-mono)" }} className={`inline-flex items-center text-[9px] font-semibold uppercase tracking-[0.1em] px-[7px] py-[3px] rounded-[5px] w-fit ${tagBg[mode.tagStyle]}`}>
        {mode.tag}
      </span>
      {mode.locked && (
        <div className="absolute inset-0 bg-[rgba(249,247,241,0.7)] backdrop-blur-[2px] rounded-[14px] flex flex-col items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity duration-150">
          <Ico d={ICONS.lock} size={22} />
          <span style={{ fontFamily: "var(--font-geist-sans)" }} className="text-[12px] font-semibold text-[#1A3C34]">
            Sign up to play
          </span>
          <button
            onClick={onSignUp}
            className="bg-[#1A3C34] text-[#EDE8DF] text-[11px] font-bold px-3 py-1.5 rounded-[8px] border-none cursor-pointer hover:bg-[#142E28] transition-colors"
          >
            Create Account
          </button>
        </div>
      )}
    </div>
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
    <div className="bg-white border border-[#E6E4DD] rounded-[14px] overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(26,25,21,0.04)" }}>
      <div className="flex items-center justify-between px-[18px] py-[14px] border-b border-[#E6E4DD]">
        <h4 style={{ fontFamily: "var(--font-geist-sans)" }} className="text-[13px] font-bold text-[#1A3C34]">
          {"Today's Leaderboard"}
        </h4>
        <span style={{ fontFamily: "var(--font-geist-mono)" }} className="text-[11px] text-[#8A8A8A]">
          {dateLabel}
        </span>
      </div>

      {loading ? (
        <div className="px-[18px] py-8 text-center text-[12px] text-[#8A8A8A]" style={{ fontFamily: "var(--font-geist-mono)" }}>
          Loading...
        </div>
      ) : entries.length === 0 ? (
        <div className="px-[18px] py-8 text-center">
          <p style={{ fontFamily: "var(--font-geist-sans)" }} className="text-[13px] font-semibold text-[#1A3C34] mb-1">
            No scores yet today
          </p>
          <p className="text-[12px] text-[#8A8A8A]">Be the first to play the daily challenge!</p>
        </div>
      ) : (
        entries.map((r, i) => {
          const initials = (r.display_name || r.username || "?").slice(0, 1).toUpperCase();
          const color = AV_COLORS[i % AV_COLORS.length];
          return (
            <div key={r.user_id} className="flex items-center gap-3 px-[18px] py-[10px] border-b border-[#E6E4DD] last:border-b-0 hover:bg-[#F9F7F1] transition-colors">
              <div style={{ fontFamily: "var(--font-geist-mono)" }} className="text-[11px] text-[#8A8A8A] w-[22px] text-center flex-shrink-0">
                {MEDALS[i] ?? `#${i + 1}`}
              </div>
              <div style={{ background: color }} className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 text-[#EDE8DF]">
                {initials}
              </div>
              <div className="flex-1">
                <div style={{ fontFamily: "var(--font-geist-sans)" }} className="text-[13px] font-semibold text-[#1A1A1A]">
                  {r.display_name || r.username}
                </div>
                <div style={{ fontFamily: "var(--font-geist-mono)" }} className="text-[11px] text-[#8A8A8A]">
                  @{r.username}
                </div>
              </div>
              <div style={{ fontFamily: "var(--font-geist-mono)" }} className="font-bold text-[14px] text-[#1A3C34]">
                {r.net_score}
              </div>
            </div>
          );
        })
      )}

      <div className="px-[18px] py-3 text-center border-t border-[#E6E4DD] bg-[rgba(249,247,241,0.5)]">
        <a href="#" style={{ fontFamily: "var(--font-geist-sans)" }} className="text-[12px] font-semibold text-[#1A3C34] no-underline hover:underline">
          View full leaderboard →
        </a>
      </div>
    </div>
  );
}

// ── Right panel — friends sign-up prompt only ──
function RightPanel({ onSignUp }: { onSignUp: () => void }) {
  return (
    <div
      style={{ width: 270, background: "#FDFCF9" }}
      className="flex-shrink-0 border-l border-[#E6E4DD] flex flex-col overflow-hidden"
    >
      <div className="px-[18px] pt-[14px] pb-[10px] border-b border-[#E6E4DD] flex-shrink-0">
        <div style={{ fontFamily: "var(--font-geist-sans)" }} className="text-[13px] font-bold text-[#1A3C34]">
          Friends
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-5 py-8 text-center">
        <div className="w-[52px] h-[52px] rounded-full bg-[rgba(26,60,52,0.07)] flex items-center justify-center text-[#1A3C34]">
          <Ico d={ICONS.users} size={24} />
        </div>
        <h4 style={{ fontFamily: "var(--font-geist-sans)" }} className="text-[14px] font-bold text-[#1A1A1A]">
          See who&apos;s playing
        </h4>
        <p className="text-[12.5px] text-[#8A8A8A] leading-[1.5] m-0">
          Sign up to follow friends, track their scores, and challenge them to matches.
        </p>
        <button
          onClick={onSignUp}
          style={{ fontFamily: "var(--font-geist-sans)" }}
          className="flex items-center justify-center w-full py-[11px] bg-[#1A3C34] text-[#EDE8DF] font-bold text-[13px] border-none rounded-[10px] cursor-pointer hover:bg-[#142E28] transition-colors mt-1"
        >
          Join Moggle
        </button>
      </div>
    </div>
  );
}

// ── Main landing page ──
interface LandingPageProps {
  onAuthSuccess: (user: User) => void;
}

export function LandingPage({ onAuthSuccess }: LandingPageProps) {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");

  const openAuth = (mode: "signup" | "signin" = "signup") => {
    setAuthMode(mode);
    setShowAuth(true);
  };

  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-[#F9F7F1]">
        <Sidebar onAuth={openAuth} />

        <div className="flex-1 overflow-y-auto flex flex-col bg-[#F9F7F1]">
          {/* Sticky topbar */}
          <div
            className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 border-b border-[#E6E4DD]"
            style={{ background: "rgba(249,247,241,0.88)", backdropFilter: "blur(8px)" }}
          >
            <div style={{ fontFamily: "var(--font-geist-sans)" }} className="flex items-center gap-[6px] text-[13px] font-semibold text-[#8A8A8A]">
              Home{" "}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-40">
                <path d="M9 6l6 6-6 6" />
              </svg>{" "}
              <span className="text-[#1A3C34]">Daily Challenge</span>
            </div>
            <div style={{ fontFamily: "var(--font-geist-mono)" }} className="flex items-center gap-[6px] px-3 py-[6px] bg-white border border-[#E6E4DD] rounded-full text-[12px] text-[#8A8A8A]">
              {today}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 px-7 py-7 pb-10 flex flex-col gap-6 max-w-[820px] w-full mx-auto">
            <DailyHero onPlay={() => openAuth("signup")} />

            <div>
              <div className="flex items-baseline justify-between mb-3">
                <h3 style={{ fontFamily: "var(--font-fraunces)" }} className="text-[18px] font-semibold text-[#1A1A1A]">
                  Game Modes
                </h3>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); openAuth("signup"); }}
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                  className="text-[12px] text-[#8A8A8A] no-underline hover:text-[#1A3C34] transition-colors"
                >
                  Sign up to unlock all →
                </a>
              </div>
              <div className="grid grid-cols-3 gap-[14px]">
                {MODES.map((mode) => (
                  <ModeCard key={mode.title} mode={mode} onSignUp={() => openAuth("signup")} />
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-3">
                <h3 style={{ fontFamily: "var(--font-fraunces)" }} className="text-[18px] font-semibold text-[#1A1A1A]">
                  Leaderboard
                </h3>
              </div>
              <LeaderboardStrip />
            </div>
          </div>
        </div>

        <RightPanel onSignUp={() => openAuth("signup")} />
      </div>

      {showAuth && (
        <AuthModal
          isOpen={showAuth}
          initialMode={authMode}
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
