"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { MultiplayerPlayer } from "@/lib/multiplayer/types";

interface Props {
    players: MultiplayerPlayer[];
    wordCounts: Record<string, number>;
    myUserId: string;
}

export function MultiplayerOpponentTracker({ players, wordCounts, myUserId }: Props) {
    const others = players.filter(p => p.user_id !== myUserId);

    if (others.length === 0) return null;

    return (
        <div className="bg-white rounded-xl border border-[#E6E4DD] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E6E4DD]">
                <div className="text-xs font-mono uppercase tracking-widest text-[#8A8A8A]">Opponents</div>
            </div>

            <div className="divide-y divide-[#F0EEE8]">
                {others.map(player => {
                    const count = wordCounts[player.user_id] ?? 0;
                    const done = !!player.finished_at;

                    return (
                        <div key={player.user_id} className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-[#1A3C34]/10 flex items-center justify-center text-[#1A3C34] font-bold text-xs">
                                    {(player.display_name || player.username)[0].toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-[#1A3C34]">
                                        {player.display_name || player.username}
                                    </div>
                                    {player.is_dnf && (
                                        <div className="text-xs text-red-500">DNF</div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={count}
                                        initial={{ scale: 1.4, color: '#D4AF37' }}
                                        animate={{ scale: 1, color: '#1A3C34' }}
                                        transition={{ duration: 0.3 }}
                                        className="font-mono font-bold text-lg text-[#1A3C34]"
                                    >
                                        {count}
                                    </motion.span>
                                </AnimatePresence>
                                <span className="text-xs text-[#8A8A8A]">words</span>
                                {done && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Done</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
