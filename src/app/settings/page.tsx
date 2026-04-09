"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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

export default function SettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const [theme, setThemeState] = useState<ThemeMode>("system");
    const [pathfinder, setPathfinderState] = useState(true);
    const [reducedMotion, setReducedMotionState] = useState(true);

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
                                <dd className="text-right">
                                    {user.email ? (
                                        <span className="font-mono text-[#1A1A1A]">{user.email}</span>
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

                {/* Preferences card */}
                <motion.section
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.05 }}
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
                    transition={{ duration: 0.25, delay: 0.1 }}
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
