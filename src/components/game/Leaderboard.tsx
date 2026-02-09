"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getTodaysLeaderboard, getUserRankToday } from "@/lib/supabase/leaderboard";
import type { LeaderboardEntry } from "@/lib/supabase/client";
import { TbTrophy, TbMedal, TbClock, TbX, TbRefresh } from "react-icons/tb";

interface LeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId?: string;
}

export function LeaderboardModal({ isOpen, onClose, userId }: LeaderboardModalProps) {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [userRank, setUserRank] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    const loadLeaderboard = async () => {
        setLoading(true);
        try {
            const data = await getTodaysLeaderboard(50);
            setEntries(data);

            if (userId) {
                const rank = await getUserRankToday(userId);
                setUserRank(rank);
            }
        } catch (error) {
            console.error("Error loading leaderboard:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadLeaderboard();
        }
    }, [isOpen, userId]);

    if (!isOpen) return null;

    const getRankDisplay = (rank: number) => {
        if (rank === 1) return <TbTrophy className="w-6 h-6 text-[#D4AF37]" />;
        if (rank === 2) return <TbMedal className="w-6 h-6 text-[#C0C0C0]" />;
        if (rank === 3) return <TbMedal className="w-6 h-6 text-[#CD7F32]" />;
        return <span className="text-sm font-mono text-[#666]">#{rank}</span>;
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#1A3C34]/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative bg-[#F9F7F1] w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl border border-[#E6E4DD] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-br from-[#1A3C34] to-[#0F2016] p-6 relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-[#D4AF37]" />

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <TbTrophy className="w-8 h-8 text-[#D4AF37]" />
                                    <div>
                                        <h2 className="text-2xl font-serif font-bold text-[#F9F7F1]">
                                            Today's Leaderboard
                                        </h2>
                                        <p className="text-sm text-[#8A9A90]">
                                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={loadLeaderboard}
                                        disabled={loading}
                                        className="p-2 rounded-lg hover:bg-white/10 text-[#F9F7F1] transition-colors disabled:opacity-50"
                                        title="Refresh"
                                    >
                                        <TbRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-lg hover:bg-white/10 text-[#F9F7F1] transition-colors"
                                    >
                                        <TbX className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* User's Rank */}
                            {userRank && (
                                <div className="mt-4 p-3 bg-[#D4AF37]/20 border border-[#D4AF37]/30 rounded-lg">
                                    <div className="flex items-center justify-between text-[#F9F7F1]">
                                        <span className="text-sm font-semibold">Your Rank</span>
                                        <div className="flex items-center gap-2">
                                            {getRankDisplay(userRank)}
                                            <span className="font-bold">#{userRank}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Leaderboard List */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {loading && entries.length === 0 ? (
                                <div className="text-center py-12 text-[#8A8A8A]">
                                    <TbRefresh className="w-8 h-8 animate-spin mx-auto mb-2" />
                                    <p>Loading leaderboard...</p>
                                </div>
                            ) : entries.length === 0 ? (
                                <div className="text-center py-12 text-[#8A8A8A]">
                                    <TbTrophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p className="text-lg font-semibold mb-1">No entries yet</p>
                                    <p className="text-sm">Be the first to play today's challenge!</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {entries.map((entry, index) => (
                                        <motion.div
                                            key={entry.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            className={`flex items-center gap-4 p-4 rounded-xl transition-all ${entry.user_id === userId
                                                ? 'bg-[#D4AF37]/10 border-2 border-[#D4AF37]'
                                                : 'bg-white border border-[#E6E4DD] hover:shadow-md'
                                                }`}
                                        >
                                            {/* Rank */}
                                            <div className="w-12 flex items-center justify-center">
                                                {getRankDisplay(index + 1)}
                                            </div>

                                            {/* User Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-[#1A3C34] truncate">
                                                    {entry.display_name || entry.username}
                                                </div>
                                                <div className="text-xs text-[#666] font-mono">
                                                    @{entry.username}
                                                </div>
                                            </div>

                                            {/* Stats */}
                                            <div className="flex items-center gap-6 text-sm">
                                                <div className="text-center">
                                                    <div className="text-2xl font-bold text-[#1A3C34]">
                                                        {entry.net_score}
                                                    </div>
                                                    <div className="text-xs text-[#8A8A8A]">Score</div>
                                                </div>

                                                <div className="text-center hidden sm:block">
                                                    <div className="text-lg font-mono text-[#666]">
                                                        {entry.words_found}
                                                    </div>
                                                    <div className="text-xs text-[#8A8A8A]">Words</div>
                                                </div>

                                                <div className="text-center hidden md:block">
                                                    <div className="flex items-center gap-1 text-[#666]">
                                                        <TbClock className="w-4 h-4" />
                                                        <span className="font-mono text-sm">
                                                            {formatTime(entry.completion_time_seconds)}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-[#8A8A8A]">Time</div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-[#E6E4DD] bg-[#F9F7F1]">
                            <div className="text-center text-xs text-[#8A8A8A]">
                                Showing top {entries.length} players
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
