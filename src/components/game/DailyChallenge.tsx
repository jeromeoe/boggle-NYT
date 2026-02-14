"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TbCalendar, TbSparkles } from "react-icons/tb";

interface DailyChallengeProps {
    onStartDaily: () => void;
    isActive: boolean;
    hasPlayed?: boolean;
}

export function DailyChallengeBanner({ onStartDaily, isActive, hasPlayed }: DailyChallengeProps) {
    const [dateStr, setDateStr] = useState<string>("");

    useEffect(() => {
        const today = new Date();
        setDateStr(today.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        }));
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[#1A3C34] via-[#1A3C34] to-[#2D5A4A] rounded-2xl p-6 md:p-8 shadow-2xl border-2 border-[#D4AF37]/30 mb-8 relative overflow-hidden"
        >
            {/* Decorative gold accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                    backgroundSize: '32px 32px'
                }} />
            </div>

            <div className="relative flex items-center justify-between gap-6">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-[#D4AF37]/10 rounded-lg border border-[#D4AF37]/30">
                            <TbCalendar className="w-5 h-5 text-[#D4AF37]" />
                        </div>
                        <div>
                            <div className="text-sm font-mono text-[#8A9A90] uppercase tracking-wider">
                                Daily Challenge
                            </div>
                            <div className="text-lg text-[#D4AF37] font-semibold">
                                {dateStr}
                            </div>
                        </div>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-serif font-bold text-[#F9F7F1] mb-2">
                        Today's Custom Boggle
                    </h3>

                    <p className="text-[#B8C5BD] text-sm">
                        {hasPlayed
                            ? "You've already played today's challenge. Replay for practice!"
                            : "The curated Boggle Board for the day. Compete globally!"}
                    </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <button
                        onClick={onStartDaily}
                        disabled={isActive}
                        className={`px-8 py-4 ${hasPlayed ? 'bg-[#2D5A4A] border-2 border-[#D4AF37] text-[#D4AF37]' : 'bg-[#D4AF37] text-[#1A3C34]'} hover:brightness-110 font-bold rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2`}
                    >
                        <TbSparkles className="w-5 h-5" />
                        {isActive ? 'Loading...' : hasPlayed ? 'Replay' : 'Play Daily'}
                    </button>
                    {hasPlayed && (
                        <span className="text-xs text-[#8A9A90] font-mono">Score managed</span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
