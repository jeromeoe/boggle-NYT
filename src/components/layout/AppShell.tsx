"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  TbBrain,
  TbChevronRight,
  TbLogout,
  TbMail,
  TbMenu2,
  TbPlayerPlay,
  TbTrophy,
  TbUsers,
  TbWorld,
  TbBolt,
  TbClock,
  TbCalendar,
} from "react-icons/tb";
import type { User } from "@/lib/supabase/client";
import NoiseOverlay from "@/components/shared/noise-overlay";
import { Engraving } from "@/components/shared/Engraving";

const AV_COLORS = ["#1A3C34", "#2D6A4F", "#9B2226", "#5C4033", "#6B4F9E", "#1A5B8A", "#7A3F00"];

function avatarColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "var(--font-geist-mono)" }} className="px-[18px] pb-1 pt-[10px] text-[9px] font-semibold uppercase tracking-[0.18em] text-white/25">
      {children}
    </div>
  );
}

function NavLink({
  href,
  label,
  icon,
  active,
  badge,
  notice,
  inset = false,
  onClick,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  badge?: string;
  notice?: number;
  inset?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative flex items-center gap-[10px] py-[9px] pr-[18px] text-[13px] font-medium no-underline transition-all ${
        inset ? "pl-[42px]" : "pl-[18px]"
      } ${active ? "bg-white/5 text-[#EDE8DF]" : "text-[rgba(237,232,223,0.6)] hover:bg-white/5 hover:text-[#EDE8DF]"}`}
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      {active && <span className="absolute bottom-1 left-0 top-1 w-[3px] rounded-r-[3px] bg-[#D4AF37]" />}
      {inset ? (
        <span className={`h-[5px] w-[5px] flex-shrink-0 rounded-full ${active ? "bg-[#D4AF37]" : "bg-[rgba(237,232,223,0.25)]"}`} />
      ) : (
        <span className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center opacity-70">{icon}</span>
      )}
      <span>{label}</span>
      {badge && (
        <span style={{ fontFamily: "var(--font-geist-mono)" }} className="ml-auto rounded-full bg-[#D4AF37] px-[6px] py-[2px] text-[9px] font-bold uppercase tracking-[0.1em] text-[#111F1C]">
          {badge}
        </span>
      )}
      {!!notice && (
        <span
          aria-label={`${notice} unread Moggle Mail`}
          style={{ fontFamily: "var(--font-geist-mono)" }}
          className="ml-auto flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#C83A2E] px-[5px] text-[9px] font-bold text-white shadow-[0_0_0_2px_rgba(17,31,28,0.9)]"
        >
          {notice > 9 ? "9+" : notice}
        </span>
      )}
    </Link>
  );
}

function GroupLink({
  href,
  label,
  icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className={`relative flex items-center gap-[10px] px-[18px] py-[9px] text-[13px] font-medium no-underline transition-all ${
        active ? "bg-white/5 text-[#EDE8DF]" : "text-[rgba(237,232,223,0.6)] hover:bg-white/5 hover:text-[#EDE8DF]"
      }`}
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      {active && <span className="absolute bottom-1 left-0 top-1 w-[3px] rounded-r-[3px] bg-[#D4AF37]" />}
      <span className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center opacity-70">{icon}</span>
      <span>{label}</span>
      {badge && (
        <span style={{ fontFamily: "var(--font-geist-mono)" }} className="ml-auto rounded-full bg-[#D4AF37] px-[6px] py-[2px] text-[9px] font-bold uppercase tracking-[0.1em] text-[#111F1C]">
          {badge}
        </span>
      )}
      <TbChevronRight size={14} className="ml-auto opacity-40" />
    </Link>
  );
}

export function AppShell({
  user,
  title,
  active,
  children,
  onSignOut,
  onDashboardClick,
  onAuth,
  mailUnread = 0,
}: {
  user?: User | null;
  title?: string;
  active?: string;
  children: React.ReactNode;
  onSignOut?: () => void;
  onDashboardClick?: () => void;
  /** Guest mode: when there's no user, the sidebar footer shows sign-up / sign-in CTAs. */
  onAuth?: (mode: "signup" | "signin") => void;
  mailUnread?: number;
}) {
  // Two independent concerns: a mobile off-canvas drawer (default closed) and a
  // desktop collapse (default open). One hamburger drives whichever applies.
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // Always close the mobile drawer after navigating.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleSidebar = () => {
    if (!isMobile) {
      setDesktopCollapsed((v) => !v);
    } else {
      setMobileOpen((v) => !v);
    }
  };
  const displayName = user?.display_name || user?.username || "Guest";
  const initial = displayName.charAt(0).toUpperCase();
  const activeId =
    active ??
    (pathname.startsWith("/leaderboard") ? "leaderboard" :
      pathname.startsWith("/rankings") ? "rankings" :
      pathname.startsWith("/puzzles") ? "puzzles" :
      pathname.startsWith("/settings") ? "settings" :
      pathname.startsWith("/replay") ? "replay" :
      pathname.startsWith("/mail") ? "mail" :
      pathname.startsWith("/play/blitz") ? "blitz" :
      pathname.startsWith("/play/rapid") ? "rapid" :
      pathname.startsWith("/play/daily") ? "daily" :
      pathname.startsWith("/play/zen") ? "zen" :
      pathname.startsWith("/play") ? "singleplayer" :
      pathname.startsWith("/practice") ? "practice" :
      pathname.startsWith("/multiplayer/friends") ? "friends-mp" :
      pathname.startsWith("/multiplayer/live") ? "live-mp" :
      pathname.startsWith("/multiplayer") ? "multiplayer" :
      "dashboard");
  const multiplayerOpen = ["multiplayer", "live-mp", "friends-mp"].includes(activeId);
  const practiceOpen = ["practice", "zen", "puzzles"].includes(activeId);
  const navigationHidden = isMobile ? !mobileOpen : desktopCollapsed;
  const frameTitle = title ?? ({
    dashboard: "Home",
    singleplayer: "Singleplayer",
    blitz: "Blitz",
    rapid: "Rapid",
    daily: "Daily Challenge",
    zen: "Zen Mode",
    practice: "Practice",
    multiplayer: "Multiplayer",
    "live-mp": "Multiplayer",
    "friends-mp": "Friends Match",
    mail: "Moggle Mail",
    leaderboard: "Leaderboard",
    rankings: "Rankings",
    settings: "Settings",
    puzzles: "Puzzles",
    replay: "Game Review",
  } as Record<string, string>)[activeId];

  return (
    <div data-app-frame="true" className="flex h-screen overflow-hidden bg-parchment text-soft-black">
      <NoiseOverlay />

      {/* Mobile drawer backdrop */}
      <div
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/55 transition-opacity duration-200 md:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        id="app-navigation"
        aria-hidden={navigationHidden}
        inert={navigationHidden || undefined}
        className={`fixed inset-y-0 left-0 z-50 flex w-[230px] flex-shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-baize-deep transition-transform duration-200 ease-out md:static md:z-20 md:translate-x-0 md:transition-[width] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${desktopCollapsed ? "md:w-0" : "md:w-[230px]"}`}
      >
        <div className="flex h-[52px] flex-shrink-0 items-center border-b border-white/[0.06] px-[18px]" style={{ minWidth: 230 }}>
          <Link href="/" onClick={onDashboardClick} className="flex items-center gap-[9px] no-underline">
            <Engraving src="/marks/tile-m.svg" className="h-[26px] w-[26px] flex-shrink-0 drop-shadow-[1px_1px_0_rgba(0,0,0,0.25)]" style={{ color: "#EDE8DF" }} />
            <span style={{ fontFamily: "var(--font-fraunces)", color: "#EDE8DF", fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em" }}>
              MOGGLE<span style={{ color: "#D4AF37" }}>.ORG</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ minWidth: 230 }}>
          <SectionLabel>Play</SectionLabel>
          <GroupLink href="/play" label="Singleplayer" icon={<TbPlayerPlay size={17} />} active={activeId === "singleplayer"} />
          <NavLink href="/play/blitz" label="Blitz" icon={<TbBolt size={17} />} active={activeId === "blitz"} badge="1 min" inset />
          <NavLink href="/play/rapid" label="Rapid" icon={<TbClock size={17} />} active={activeId === "rapid"} badge="3 min" inset />
          <NavLink href="/play/daily" label="Daily Challenge" icon={<TbCalendar size={17} />} active={activeId === "daily"} inset />
          <GroupLink href="/multiplayer/live" label="Multiplayer" icon={<TbUsers size={17} />} active={activeId === "multiplayer"} badge="Beta" />
          {multiplayerOpen && (
            <>
              <NavLink href="/multiplayer/live" label="Live Multiplayer" active={activeId === "live-mp"} inset />
              <NavLink href="/multiplayer/friends" label="Friends Match" active={activeId === "friends-mp"} inset />
            </>
          )}

          <SectionLabel>Practice</SectionLabel>
          <GroupLink href="/practice" label="Practice" icon={<TbBrain size={17} />} active={activeId === "practice"} />
          {practiceOpen && (
            <>
              <NavLink href="/practice" label="Microboards" active={activeId === "practice"} inset />
              <NavLink href="/play/zen" label="Zen Mode" active={activeId === "zen"} inset />
              <NavLink href="/puzzles" label="Puzzles" active={activeId === "puzzles"} badge="New" inset />
            </>
          )}

          <SectionLabel>Mail</SectionLabel>
          <NavLink href="/mail" label="Moggle Mail" icon={<TbMail size={17} />} active={activeId === "mail"} notice={mailUnread} />

          <SectionLabel>Community</SectionLabel>
          <NavLink href="/leaderboard" label="Leaderboard" icon={<TbTrophy size={17} />} active={activeId === "leaderboard"} />
          <NavLink href="/rankings" label="Rankings" icon={<TbWorld size={17} />} active={activeId === "rankings"} />
        </nav>

        {user ? (
          <div className="flex-shrink-0 border-t border-white/[0.07] p-[14px]" style={{ minWidth: 230 }}>
            <Link href="/settings" className="flex items-center gap-[10px] rounded-[10px] border border-white/[0.08] bg-white/5 p-[10px_12px] no-underline transition-colors hover:bg-white/[0.09]">
              <div style={{ background: avatarColor(user.id) }} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-[#111F1C]">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div style={{ fontFamily: "var(--font-geist-sans)" }} className="truncate text-[13px] font-bold text-[#EDE8DF]">
                  {displayName}
                </div>
                <div style={{ fontFamily: "var(--font-geist-mono)" }} className="text-[10.5px] font-semibold text-[rgba(237,232,223,0.35)]">
                  Settings
                </div>
              </div>
              <TbChevronRight size={15} className="text-[rgba(237,232,223,0.35)]" />
            </Link>
          </div>
        ) : onAuth ? (
          <div className="flex flex-shrink-0 flex-col gap-2 border-t border-white/[0.07] p-[14px]" style={{ minWidth: 230 }}>
            <button
              onClick={() => onAuth("signup")}
              style={{ fontFamily: "var(--font-geist-sans)", boxShadow: "0 4px 12px -2px rgba(212,175,55,0.35)" }}
              className="flex items-center justify-center rounded-[10px] border-none bg-brass px-4 py-[11px] text-[13px] font-bold text-baize-deep transition-all hover:brightness-110"
            >
              Create Free Account
            </button>
            <button
              onClick={() => onAuth("signin")}
              style={{ fontFamily: "var(--font-geist-sans)" }}
              className="flex items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.06] px-4 py-[9px] text-[13px] font-medium text-[rgba(237,232,223,0.7)] transition-all hover:bg-white/10 hover:text-[#EDE8DF]"
            >
              Sign In
            </button>
          </div>
        ) : null}
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-[52px] flex-shrink-0 items-center gap-5 border-b border-white/[0.06] bg-baize-deep px-4 sm:px-5">
          <button
            onClick={toggleSidebar}
            aria-controls="app-navigation"
            aria-expanded={!navigationHidden}
            aria-label={navigationHidden ? "Open navigation" : "Close navigation"}
            className="flex-shrink-0 cursor-pointer rounded-[6px] border-none bg-transparent p-1.5 text-[rgba(237,232,223,0.45)] transition-colors hover:bg-white/5 hover:text-[#EDE8DF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass"
            title="Toggle navigation"
          >
            <TbMenu2 size={18} />
          </button>

          {frameTitle && (
            <>
              <div style={{ fontFamily: "var(--font-geist-mono)" }} className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgba(237,232,223,0.4)]">
                {frameTitle}
              </div>
            </>
          )}

          <div className="flex-1" />
          {user && (
            <Link href="/settings" className="hidden items-center gap-2 rounded-[8px] border border-white/[0.07] bg-white/[0.05] py-1 pl-1 pr-3 text-[12.5px] font-semibold text-[rgba(237,232,223,0.8)] no-underline transition-colors hover:bg-white/[0.1] sm:flex">
              <div style={{ background: avatarColor(user.id) }} className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-[#111F1C]">
                {initial}
              </div>
              {displayName}
            </Link>
          )}
          {onSignOut && (
            <button onClick={onSignOut} className="rounded-[6px] border-none bg-transparent p-1.5 text-[rgba(237,232,223,0.4)] transition-all hover:bg-white/5 hover:text-[rgba(237,232,223,0.8)]" title="Sign out">
              <TbLogout size={17} />
            </button>
          )}
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
