"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    TbArrowLeft,
    TbUser,
    TbPalette,
    TbRoute,
    TbAccessible,
    TbLogout,
    TbSun,
    TbMoon,
    TbDeviceDesktop,
    TbMail,
    TbCalendar,
    TbCheck,
    TbLock,
    TbFlame,
    TbShield,
    TbTrophy,
    TbStar,
    TbChartBar,
    TbMailCheck,
    TbAlertCircle,
    TbLoader2,
    TbRefresh,
} from "react-icons/tb";
import NoiseOverlay from "@/components/shared/noise-overlay";
import { getCurrentUser, signOut } from "@/lib/supabase/auth";
import type { User } from "@/lib/supabase/client";
import {
    getStoredTheme,
    setTheme,
    getPathfinderEnabled,
    setPathfinderEnabled,
    getReducedMotionEnabled,
    setReducedMotion,
    type ThemeMode,
} from "@/lib/preferences";
import type { MedalTier } from "@/lib/boggle/medals";
import { medalColor, medalLabel } from "@/lib/boggle/medals";

interface DailyStats {
    current_streak: number;
    best_streak: number;
    last_daily_date: string | null;
    streak_freeze_available: number;
    games_played: number;
    best_net_score: number;
    best_gross_score: number;
    bronze_medals: number;
    silver_medals: number;
    gold_medals: number;
    platinum_medals: number;
    participation_medals: number;
}

interface MeData {
    emailVerified: boolean;
    email: string | null;
    stats: DailyStats | null;
}

// Medal SVG icon component
function MedalIcon({ tier, size = 28 }: { tier: MedalTier; size?: number }) {
    const { primary, secondary } = medalColor(tier);
    const isPart = tier === 'participation';
    return (
        <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Ribbon top */}
            <polygon points="8,2 14,8 20,2" fill={secondary} opacity={isPart ? 0.4 : 1} />
            {/* Circle */}
            <circle cx="14" cy="17" r="9" fill={primary} stroke={secondary} strokeWidth={isPart ? 1 : 1.5} opacity={isPart ? 0.5 : 1} />
            {/* Inner shine */}
            <circle cx="14" cy="17" r="6" fill="none" stroke="white" strokeWidth="0.8" opacity={isPart ? 0.2 : 0.35} />
            {/* Star / letter */}
            {!isPart && (
                <text x="14" y="21" textAnchor="middle" fontSize="8" fontWeight="bold" fill={secondary} fontFamily="Georgia,serif">
                    {tier === 'platinum' ? 'Pt' : tier === 'gold' ? 'G' : tier === 'silver' ? 'S' : 'B'}
                </text>
            )}
        </svg>
    );
}

function MedalTally({ count, tier }: { count: number; tier: MedalTier }) {
    return (
        <div className="flex flex-col items-center gap-1.5 min-w-0">
            <MedalIcon tier={tier} size={32} />
            <span className="text-xs font-mono font-semibold text-[#1A3C34]">{count}</span>
            <span className="text-[10px] text-[#888] uppercase tracking-wide leading-none">{medalLabel(tier)}</span>
        </div>
    );
}

export default function SettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const [theme, setThemeState] = useState<ThemeMode>("system");
    const [pathfinder, setPathfinderState] = useState(true);
    const [reducedMotion, setReducedMotionState] = useState(true);

    const [meData, setMeData] = useState<MeData | null>(null);
    const [meLoading, setMeLoading] = useState(true);
    const [verifyBannerDismissed, setVerifyBannerDismissed] = useState(false);
    const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const [emailInput, setEmailInput] = useState("");
    const [emailInputError, setEmailInputError] = useState("");

    useEffect(() => {
        const u = getCurrentUser();
        if (!u) {
            router.replace("/");
            return;
        }
        setUser(u);
        setThemeState(getStoredTheme());
        setPathfinderState(getPathfinderEnabled());
        setReducedMotionState(getReducedMotionEnabled());
        setLoading(false);

        // Check if banner was dismissed this session
        if (sessionStorage.getItem('verify_banner_dismissed')) {
            setVerifyBannerDismissed(true);
        }

        // Fetch live email verification + stats
        fetch('/api/stats/me')
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setMeData(data); })
            .catch(() => {})
            .finally(() => setMeLoading(false));
    }, [router]);

    const handleThemeChange = (mode: ThemeMode) => {
        setThemeState(mode);
        setTheme(mode);
    };

    const handlePathfinderToggle = () => {
        const next = !pathfinder;
        setPathfinderState(next);
        setPathfinderEnabled(next);
    };

    const handleReducedMotionToggle = () => {
        const next = !reducedMotion;
        setReducedMotionState(next);
        setReducedMotion(next);
    };

    const handleSignOut = async () => {
        await signOut();
        router.push("/");
    };

    const handleDismissBanner = () => {
        setVerifyBannerDismissed(true);
        sessionStorage.setItem('verify_banner_dismissed', '1');
    };

    const handleResendVerification = async (emailOverride?: string) => {
        setEmailInputError("");
        setResendState('sending');
        try {
            const body = emailOverride ? { email: emailOverride } : {};
            const res = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.needsEmail) {
                    setResendState('idle');
                    return;
                }
                setEmailInputError(data.error ?? 'Something went wrong.');
                setResendState('error');
                setTimeout(() => setResendState('idle'), 3000);
            } else {
                setResendState('sent');
                // Update local meData to reflect the newly saved email
                if (emailOverride) {
                    setMeData(prev => prev ? { ...prev, email: emailOverride } : prev);
                }
            }
        } catch {
            setResendState('error');
            setTimeout(() => setResendState('idle'), 3000);
        }
    };

    const handleAddEmailAndVerify = async () => {
        const trimmed = emailInput.trim();
        if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            setEmailInputError("Please enter a valid email address.");
            return;
        }
        await handleResendVerification(trimmed);
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-[#F9F7F1] text-[#1A1A1A] flex items-center justify-center font-serif">
                <div className="animate-pulse text-lg tracking-widest">LOADING SETTINGS...</div>
            </div>
        );
    }

    const memberSince = new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const stats = meData?.stats;
    const isVerified = meData?.emailVerified ?? false;
    const showVerifyBanner = !isVerified && !verifyBannerDismissed && !meLoading;

    return (
        <div className="min-h-screen bg-[#F9F7F1] text-[#1A1A1A] relative overflow-hidden">
            <NoiseOverlay />

            <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-12">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[#666] hover:text-[#1A3C34] transition-colors mb-4"
                    >
                        <TbArrowLeft className="w-3.5 h-3.5" />
                        Back to game
                    </Link>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#8A8A8A]">
                        Profile
                    </div>
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#1A3C34] mt-1">
                        Settings
                    </h1>
                </div>

                {/* Email verification banner */}
                <AnimatePresence>
                    {showVerifyBanner && (
                        <motion.div
                            initial={{ opacity: 0, y: -8, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -8, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mb-6 overflow-hidden"
                        >
                            <div className="rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/8 p-4 flex items-start gap-3">
                                <TbAlertCircle className="w-5 h-5 text-[#A07820] shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-[#7A5A10]">
                                        Verify your email for Advanced Analytics
                                    </p>
                                    <p className="text-xs text-[#8A6A20] mt-0.5 leading-relaxed">
                                        Streak tracking, medals, and personal bests are only saved for verified accounts.
                                    </p>
                                    {resendState === 'sent' ? (
                                        <p className="text-xs text-[#2D6A4F] font-semibold mt-2">Email sent — check your inbox!</p>
                                    ) : !meData?.email ? (
                                        <div className="mt-2 flex flex-col gap-1.5">
                                            <div className="flex gap-2">
                                                <input
                                                    type="email"
                                                    value={emailInput}
                                                    onChange={e => { setEmailInput(e.target.value); setEmailInputError(""); }}
                                                    placeholder="your@email.com"
                                                    className="flex-1 text-xs px-3 py-1.5 rounded-md border border-[#D4AF37]/50 bg-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37] text-[#1A1A1A]"
                                                />
                                                <button
                                                    onClick={handleAddEmailAndVerify}
                                                    disabled={resendState === 'sending'}
                                                    className="text-xs font-semibold px-3 py-1.5 bg-[#1A3C34] text-[#F9F7F1] rounded-md hover:bg-[#142E28] disabled:opacity-60 transition-colors whitespace-nowrap"
                                                >
                                                    {resendState === 'sending' ? <TbLoader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add & Verify'}
                                                </button>
                                            </div>
                                            {emailInputError && <p className="text-[11px] text-[#9B2226]">{emailInputError}</p>}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleResendVerification()}
                                            disabled={resendState === 'sending'}
                                            className="mt-2 text-xs font-semibold text-[#7A5A10] hover:underline inline-flex items-center gap-1 disabled:opacity-60"
                                        >
                                            {resendState === 'sending' ? (
                                                <><TbLoader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                                            ) : resendState === 'error' ? (
                                                'Failed — try again'
                                            ) : (
                                                <><TbRefresh className="w-3.5 h-3.5" /> Resend verification email</>
                                            )}
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={handleDismissBanner}
                                    className="shrink-0 text-[#A07820]/60 hover:text-[#A07820] transition-colors text-lg leading-none"
                                    aria-label="Dismiss banner"
                                >
                                    ×
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Account card */}
                <motion.section
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="mb-6 rounded-2xl bg-white border border-[#E6E4DD] shadow-sm overflow-hidden"
                >
                    <div className="px-6 py-4 border-b border-[#E6E4DD] bg-[#F9F7F1]/50 flex items-center gap-2">
                        <TbUser className="w-4 h-4 text-[#1A3C34]" />
                        <div className="text-[10px] font-mono uppercase tracking-widest text-[#8A8A8A]">
                            Account
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 rounded-full bg-[#1A3C34] text-[#D4AF37] flex items-center justify-center font-serif font-bold text-2xl border border-[#D4AF37]/30 shrink-0">
                                {(user.display_name || user.username).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <div className="text-lg font-serif font-bold text-[#1A3C34] truncate">
                                    {user.display_name || user.username}
                                </div>
                                <div className="text-xs font-mono text-[#8A8A8A]">
                                    @{user.username}
                                </div>
                            </div>
                        </div>

                        <dl className="space-y-3 text-sm">
                            <div className="flex items-start justify-between gap-4 py-2 border-t border-[#E6E4DD]">
                                <dt className="flex items-center gap-2 text-[#666]">
                                    <TbMail className="w-4 h-4" />
                                    Email
                                </dt>
                                <dd className="text-right flex items-center gap-2">
                                    {user.email ? (
                                        <>
                                            <span className="font-mono text-[#1A1A1A] text-xs">{user.email}</span>
                                            {!meLoading && (
                                                isVerified ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wide text-[#2D6A4F] bg-[#2D6A4F]/10 px-1.5 py-0.5 rounded-full">
                                                        <TbMailCheck className="w-3 h-3" /> Verified
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wide text-[#A07820] bg-[#D4AF37]/15 px-1.5 py-0.5 rounded-full">
                                                        Unverified
                                                    </span>
                                                )
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-xs font-mono uppercase tracking-wider text-[#9B2226]">
                                            Not set
                                        </span>
                                    )}
                                </dd>
                            </div>
                            <div className="flex items-start justify-between gap-4 py-2 border-t border-[#E6E4DD]">
                                <dt className="flex items-center gap-2 text-[#666]">
                                    <TbCalendar className="w-4 h-4" />
                                    Member since
                                </dt>
                                <dd className="font-mono text-[#1A1A1A]">{memberSince}</dd>
                            </div>
                        </dl>

                        <div className="mt-4 pt-4 border-t border-[#E6E4DD] flex items-center gap-2 text-xs text-[#8A8A8A]">
                            <TbLock className="w-3.5 h-3.5" />
                            Editing account details is coming soon.
                        </div>
                    </div>
                </motion.section>

                {/* Daily Stats card */}
                <motion.section
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.04 }}
                    className="mb-6 rounded-2xl bg-white border border-[#E6E4DD] shadow-sm overflow-hidden"
                >
                    <div className="px-6 py-4 border-b border-[#E6E4DD] bg-[#F9F7F1]/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TbChartBar className="w-4 h-4 text-[#1A3C34]" />
                            <div className="text-[10px] font-mono uppercase tracking-widest text-[#8A8A8A]">
                                Daily Stats
                            </div>
                        </div>
                        {!isVerified && !meLoading && (
                            <span className="text-[10px] font-mono uppercase tracking-wide text-[#A07820] bg-[#D4AF37]/15 px-2 py-0.5 rounded-full">
                                Verify email to unlock
                            </span>
                        )}
                    </div>

                    <div className="p-6">
                        {meLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <TbLoader2 className="w-6 h-6 text-[#1A3C34] animate-spin" />
                            </div>
                        ) : !isVerified ? (
                            /* Unverified locked state */
                            <div className="text-center py-6 space-y-3">
                                <div className="flex justify-center">
                                    <div className="w-14 h-14 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                                        <TbShield className="w-7 h-7 text-[#A07820]" />
                                    </div>
                                </div>
                                <p className="text-sm text-[#666] max-w-xs mx-auto leading-relaxed">
                                    Verify your email to start tracking streaks, earning medals, and recording your personal bests.
                                </p>
                                {resendState === 'sent' ? (
                                    <p className="text-xs font-semibold text-[#2D6A4F]">Verification email sent!</p>
                                ) : !meData?.email ? (
                                    <div className="flex flex-col items-center gap-1.5 w-full max-w-xs mx-auto">
                                        <div className="flex gap-2 w-full">
                                            <input
                                                type="email"
                                                value={emailInput}
                                                onChange={e => { setEmailInput(e.target.value); setEmailInputError(""); }}
                                                placeholder="your@email.com"
                                                className="flex-1 text-sm px-3 py-2 rounded-lg border border-[#E6E4DD] bg-white focus:outline-none focus:ring-2 focus:ring-[#1A3C34] text-[#1A1A1A]"
                                            />
                                            <button
                                                onClick={handleAddEmailAndVerify}
                                                disabled={resendState === 'sending'}
                                                className="text-sm font-semibold px-3 py-2 bg-[#1A3C34] text-[#F9F7F1] rounded-lg hover:bg-[#142E28] disabled:opacity-60 transition-colors whitespace-nowrap"
                                            >
                                                {resendState === 'sending' ? <TbLoader2 className="w-4 h-4 animate-spin" /> : 'Add & Verify'}
                                            </button>
                                        </div>
                                        {emailInputError && <p className="text-xs text-[#9B2226]">{emailInputError}</p>}
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleResendVerification()}
                                        disabled={resendState === 'sending'}
                                        className="text-sm font-semibold text-[#1A3C34] hover:underline inline-flex items-center gap-1.5 disabled:opacity-60"
                                    >
                                        {resendState === 'sending' ? (
                                            <><TbLoader2 className="w-4 h-4 animate-spin" /> Sending…</>
                                        ) : (
                                            <><TbMailCheck className="w-4 h-4" /> Send verification email</>
                                        )}
                                    </button>
                                )}
                            </div>
                        ) : stats ? (
                            /* Verified — show stats */
                            <div className="space-y-6">
                                {/* Streak row */}
                                <div className="flex items-center gap-6 flex-wrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center">
                                            <TbFlame className="w-6 h-6 text-[#FF6B35]" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-serif font-bold text-[#1A3C34] leading-none">
                                                {stats.current_streak}
                                            </div>
                                            <div className="text-xs text-[#888] mt-0.5">Day Streak</div>
                                        </div>
                                    </div>

                                    <div className="h-10 w-px bg-[#E6E4DD]" />

                                    <div>
                                        <div className="text-sm font-semibold text-[#1A3C34]">{stats.best_streak}</div>
                                        <div className="text-xs text-[#888]">Best streak</div>
                                    </div>

                                    {stats.streak_freeze_available > 0 && (
                                        <>
                                            <div className="h-10 w-px bg-[#E6E4DD]" />
                                            <div className="flex items-center gap-1.5 text-xs text-[#2D6A4F] bg-[#2D6A4F]/8 px-2.5 py-1.5 rounded-lg border border-[#2D6A4F]/20">
                                                <TbShield className="w-3.5 h-3.5" />
                                                Streak freeze ready
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Key numbers */}
                                <div className="grid grid-cols-3 gap-3">
                                    <StatBox label="Games played" value={stats.games_played} />
                                    <StatBox label="Best score" value={stats.best_net_score} />
                                    <StatBox label="Best gross" value={stats.best_gross_score} />
                                </div>

                                {/* Medals */}
                                <div>
                                    <div className="text-xs font-mono uppercase tracking-widest text-[#8A8A8A] mb-3 flex items-center gap-1.5">
                                        <TbTrophy className="w-3.5 h-3.5" />
                                        Medal Collection
                                    </div>
                                    <div className="flex gap-5 flex-wrap">
                                        <MedalTally count={stats.platinum_medals}     tier="platinum" />
                                        <MedalTally count={stats.gold_medals}         tier="gold" />
                                        <MedalTally count={stats.silver_medals}       tier="silver" />
                                        <MedalTally count={stats.bronze_medals}       tier="bronze" />
                                        <MedalTally count={stats.participation_medals} tier="participation" />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Verified but no games played yet */
                            <div className="text-center py-6 space-y-2">
                                <TbStar className="w-8 h-8 text-[#D4AF37] mx-auto" />
                                <p className="text-sm text-[#666]">No daily challenges played yet.</p>
                                <p className="text-xs text-[#888]">Play today's board to start your streak!</p>
                            </div>
                        )}
                    </div>
                </motion.section>

                {/* Preferences card */}
                <motion.section
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.08 }}
                    className="mb-6 rounded-2xl bg-white border border-[#E6E4DD] shadow-sm overflow-hidden"
                >
                    <div className="px-6 py-4 border-b border-[#E6E4DD] bg-[#F9F7F1]/50 flex items-center gap-2">
                        <TbPalette className="w-4 h-4 text-[#1A3C34]" />
                        <div className="text-[10px] font-mono uppercase tracking-widest text-[#8A8A8A]">
                            Preferences
                        </div>
                    </div>

                    <div className="divide-y divide-[#E6E4DD]">
                        {/* Theme */}
                        <div className="p-6">
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-[#1A3C34]">
                                        <TbPalette className="w-4 h-4" />
                                        Appearance
                                    </div>
                                    <p className="text-xs text-[#666] mt-1">
                                        Pick a theme. "System" matches your OS setting and follows it
                                        when you change it.
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {([
                                    { value: "light", label: "Light", Icon: TbSun },
                                    { value: "dark", label: "Dark", Icon: TbMoon },
                                    { value: "system", label: "System", Icon: TbDeviceDesktop },
                                ] as const).map(({ value, label, Icon }) => {
                                    const active = theme === value;
                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => handleThemeChange(value)}
                                            className={`relative flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-lg border text-xs font-semibold transition-all ${active
                                                ? "border-[#1A3C34] bg-[#1A3C34] text-[#F9F7F1] shadow-sm"
                                                : "border-[#E6E4DD] bg-white text-[#666] hover:border-[#1A3C34] hover:text-[#1A3C34]"
                                                }`}
                                        >
                                            <Icon className="w-5 h-5" />
                                            {label}
                                            {active && (
                                                <TbCheck className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-[#D4AF37]" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Pathfinder */}
                        <div className="p-6">
                            <label className="flex items-start justify-between gap-4 cursor-pointer">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-[#1A3C34]">
                                        <TbRoute className="w-4 h-4" />
                                        Pathfinder
                                    </div>
                                    <p className="text-xs text-[#666] mt-1 max-w-md">
                                        Visual indicator that traces your word on the board as you
                                        type. Turn this off if you'd rather find the path yourself.
                                    </p>
                                </div>
                                <Toggle
                                    enabled={pathfinder}
                                    onToggle={handlePathfinderToggle}
                                    ariaLabel="Toggle pathfinder"
                                />
                            </label>
                        </div>

                        {/* Reduced motion */}
                        <div className="p-6">
                            <label className="flex items-start justify-between gap-4 cursor-pointer">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-[#1A3C34]">
                                        <TbAccessible className="w-4 h-4" />
                                        Reduce motion
                                    </div>
                                    <p className="text-xs text-[#666] mt-1 max-w-md">
                                        Minimize animations and transitions throughout the app.
                                    </p>
                                </div>
                                <Toggle
                                    enabled={reducedMotion}
                                    onToggle={handleReducedMotionToggle}
                                    ariaLabel="Toggle reduced motion"
                                />
                            </label>
                        </div>
                    </div>
                </motion.section>

                {/* Sign out */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.12 }}
                    className="flex justify-end"
                >
                    <button
                        onClick={handleSignOut}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#9B2226]/30 bg-white text-[#9B2226] text-sm font-semibold hover:bg-[#9B2226] hover:text-white transition-colors"
                    >
                        <TbLogout className="w-4 h-4" />
                        Sign out
                    </button>
                </motion.div>
            </div>
        </div>
    );
}

function StatBox({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl bg-[#F9F7F1] border border-[#E6E4DD] p-3 text-center">
            <div className="text-xl font-serif font-bold text-[#1A3C34]">{value}</div>
            <div className="text-[10px] text-[#888] mt-0.5 leading-tight">{label}</div>
        </div>
    );
}

interface ToggleProps {
    enabled: boolean;
    onToggle: () => void;
    ariaLabel: string;
}

function Toggle({ enabled, onToggle, ariaLabel }: ToggleProps) {
    return (
        <button
            type="button"
            onClick={onToggle}
            role="switch"
            aria-checked={enabled}
            aria-label={ariaLabel}
            className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${enabled ? "bg-[#1A3C34]" : "bg-[#D4D2CB]"
                }`}
        >
            <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0"
                    }`}
            />
        </button>
    );
}
