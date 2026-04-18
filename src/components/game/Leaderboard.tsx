"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getLeaderboardForDate, getUserRankForDate, getRecentDates } from "@/lib/supabase/leaderboard";
import type { LeaderboardEntry } from "@/lib/supabase/client";
import { TbTrophy, TbMedal, TbClock, TbX, TbRefresh } from "react-icons/tb";

interface LeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId?: string;
}

const DAYS = 7;
const DATES = getRecentDates(DAYS); // newest first

function formatDateLabel(dateStr: string, index: number): { top: string; bottom: string } {
    if (index === 0) return { top: "Today", bottom: "" };
    if (index === 1) return { top: "Yesterday", bottom: "" };
    const d = new Date(dateStr + "T00:00:00");
    return {
        top: d.toLocaleDateString("en-US", { weekday: "short" }),
        bottom: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
}

export function LeaderboardModal({ isOpen, onClose, userId }: LeaderboardModalProps) {
    const [selectedDate, setSelectedDate] = useState(DATES[0]);
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [userRank, setUserRank] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    const load = async (date: string) => {
        setLoading(true);
        setEntries([]);
        setUserRank(null);
        try {
            const [data, rank] = await Promise.all([
                getLeaderboardForDate(date, 20),
                userId ? getUserRankForDate(userId, date) : Promise.resolve(null),
            ]);
            setEntries(data);
            setUserRank(rank);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) load(selectedDate);
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleDateSelect = (date: string) => {
        setSelectedDate(date);
        load(date);
    };

    if (!isOpen) return null;

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <TbTrophy className="w-5 h-5 text-[#D4AF37]" />;
        if (rank === 2) return <TbMedal className="w-5 h-5 text-[#C0C0C0]" />;
        if (rank === 3) return <TbMedal className="w-5 h-5 text-[#CD7F32]" />;
        return <span className="text-sm font-mono text-[#8A9A90] w-5 text-center">#{rank}</span>;
    };

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

    const selectedIndex = DATES.indexOf(selectedDate);
    const { top: selectedTop, bottom: selectedBottom } = formatDateLabel(selectedDate, selectedIndex);
    const selectedLabel = selectedBottom ? `${selectedTop}, ${selectedBottom}` : selectedTop;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#1A3C34]/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative bg-[#F9F7F1] w-full max-w-2xl max-h-[90vh] rounded-xl shadow-2xl border border-[#E6E4DD] overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-br from-[#1A3C34] to-[#0F2016] px-6 pt-5 pb-4 relative">
                            <div className="absolute top-0 left-0 w-full h-0.5 bg-[#D4AF37]" />
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <TbTrophy className="w-7 h-7 text-[#D4AF37]" />
                                    <div>
                                        <h2 className="text-xl font-serif font-bold text-[#F9F7F1] leading-tight">Daily Leaderboard</h2>
                                        <p className="text-xs text-[#8A9A90] mt-0.5">{selectedLabel}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => load(selectedDate)}
                                        disabled={loading}
                                        className="p-2 rounded-lg hover:bg-white/10 text-[#8A9A90] hover:text-[#F9F7F1] transition-colors disabled:opacity-40"
                                    >
                                        <TbRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                                    </button>
                                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-[#8A9A90] hover:text-[#F9F7F1] transition-colors">
                                        <TbX className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* 7-day date strip — oldest left → Today right */}
                            <div className="flex gap-1">
                                {[...DATES].reverse().map((date, i) => {
                                    // After reversing, index 0 = oldest. Re-derive the original index for labels.
                                    const origIndex = DATES.indexOf(date);
                                    const { top, bottom } = formatDateLabel(date, origIndex);
                                    const active = date === selectedDate;
                                    const isToday = origIndex === 0;
                                    return (
                                        <button
                                            key={date}
                                            onClick={() => handleDateSelect(date)}
                                            className={`flex-1 py-2 px-1 rounded-lg text-center transition-all ${
                                                active
                                                    ? "bg-[#D4AF37] text-[#1A3C34] shadow-md"
                                                    : isToday
                                                    ? "bg-white/12 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#1A3C34] ring-1 ring-[#D4AF37]/40"
                                                    : "bg-white/8 text-[#8A9A90] hover:bg-white/15 hover:text-[#F9F7F1]"
                                            }`}
                                        >
                                            <div className={`text-[11px] font-bold leading-tight`}>{top}</div>
                                            {bottom && <div className={`text-[9px] leading-tight mt-0.5 opacity-70`}>{bottom}</div>}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* User rank pill */}
                            {userRank && (
                                <div className="mt-3 flex items-center justify-between px-3 py-2 bg-[#D4AF37]/15 border border-[#D4AF37]/25 rounded-lg">
                                    <span className="text-xs text-[#F9F7F1]/70">Your rank</span>
                                    <div className="flex items-center gap-1.5">
                                        {getRankIcon(userRank)}
                                        <span className="text-sm font-bold text-[#F9F7F1]">#{userRank}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {loading ? (
                                <div className="flex items-center justify-center py-16 text-[#8A8A8A]">
                                    <TbRefresh className="w-6 h-6 animate-spin mr-2" />
                                    <span className="text-sm">Loading...</span>
                                </div>
                            ) : entries.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-[#8A8A8A]">
                                    <TbTrophy className="w-10 h-10 mb-3 opacity-20" />
                                    <p className="font-semibold text-sm">No entries for this day</p>
                                    <p className="text-xs mt-1 text-[#AAAAAA]">
                                        {selectedIndex === 0 ? "Be the first to play today's challenge!" : "Nobody played that day."}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    {entries.map((entry, i) => (
                                        <motion.div
                                            key={entry.id}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.025 }}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                                                entry.user_id === userId
                                                    ? "bg-[#D4AF37]/10 border-[#D4AF37]/50"
                                                    : "bg-white border-[#E6E4DD] hover:border-[#C8C6C0]"
                                            }`}
                                        >
                                            <div className="w-6 flex items-center justify-center flex-shrink-0">
                                                {getRankIcon(i + 1)}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-[#1A3C34] text-sm truncate">
                                                    {entry.display_name || entry.username}
                                                    {entry.user_id === userId && (
                                                        <span className="ml-2 text-[10px] font-mono text-[#D4AF37] uppercase tracking-wide">you</span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-[#999] font-mono">@{entry.username}</div>
                                            </div>

                                            <div className="flex items-center gap-4 text-right flex-shrink-0">
                                                <div>
                                                    <div className="text-lg font-bold text-[#1A3C34] leading-tight">{entry.net_score}</div>
                                                    <div className="text-[10px] text-[#AAAAAA]">{entry.gross_score} raw</div>
                                                </div>
                                                <div className="hidden sm:block">
                                                    <div className="text-sm font-mono text-[#666]">{entry.words_found}w</div>
                                                    <div className="flex items-center gap-0.5 text-[#999] justify-end">
                                                        <TbClock className="w-3 h-3" />
                                                        <span className="text-[10px] font-mono">{formatTime(entry.completion_time_seconds)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="px-4 py-2.5 border-t border-[#E6E4DD] text-center text-[10px] text-[#AAAAAA] font-mono">
                            top 20 · resets midnight SGT
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
