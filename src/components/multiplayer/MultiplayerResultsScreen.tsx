"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TbTrophy, TbMedal, TbChevronDown, TbChevronUp, TbRefresh, TbDoorExit } from "react-icons/tb";
import type { MultiplayerPlayer } from "@/lib/multiplayer/types";

interface Props {
    players: MultiplayerPlayer[];
    myUserId: string;
    isHost: boolean;
    onPlayAgain: () => void;
    onLeave: () => void;
}

const RANK_ICONS = [
    <TbTrophy key="1" className="w-5 h-5 text-[#D4AF37]" />,
    <TbMedal key="2" className="w-5 h-5 text-[#9CA3AF]" />,
    <TbMedal key="3" className="w-5 h-5 text-[#92400E]" />,
];

function WordList({ words, label, color }: { words: string[] | null; label: string; color: string }) {
    if (!words || words.length === 0) return null;
    return (
        <div>
            <div className={`text-xs font-mono uppercase tracking-wider mb-1 ${color}`}>{label} ({words.length})</div>
            <div className="flex flex-wrap gap-1">
                {words.map(w => (
                    <span key={w} className="text-xs bg-[#F0EEE8] text-[#444] px-2 py-0.5 rounded font-mono">{w}</span>
                ))}
            </div>
        </div>
    );
}

export function MultiplayerResultsScreen({ players, myUserId, isHost, onPlayAgain, onLeave }: Props) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Sort by net_score DESC, DNF last
    const sorted = [...players].sort((a, b) => {
        if (a.is_dnf && !b.is_dnf) return 1;
        if (!a.is_dnf && b.is_dnf) return -1;
        return (b.net_score ?? 0) - (a.net_score ?? 0);
    });

    return (
        <div className="w-full max-w-lg mx-auto space-y-4">
            <div className="text-center">
                <div className="text-xs font-mono uppercase tracking-widest text-[#8A8A8A] mb-1">Game Over</div>
                <h2 className="text-2xl font-serif font-bold text-[#1A3C34]">Results</h2>
            </div>

            <div className="space-y-2">
                {sorted.map((player, idx) => {
                    const isMe = player.user_id === myUserId;
                    const expanded = expandedId === player.user_id;
                    const rank = idx + 1;

                    return (
                        <motion.div
                            key={player.user_id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.06 }}
                            className={`rounded-xl border overflow-hidden ${isMe ? 'border-[#1A3C34] bg-[#1A3C34]/5' : 'border-[#E6E4DD] bg-white'}`}
                        >
                            <button
                                onClick={() => setExpandedId(expanded ? null : player.user_id)}
                                className="w-full flex items-center gap-4 px-5 py-4 text-left"
                            >
                                {/* Rank */}
                                <div className="w-8 flex justify-center flex-shrink-0">
                                    {rank <= 3 && !player.is_dnf ? RANK_ICONS[rank - 1] : (
                                        <span className="text-sm font-bold text-[#8A8A8A]">#{rank}</span>
                                    )}
                                </div>

                                {/* Avatar */}
                                <div className="w-9 h-9 rounded-full bg-[#1A3C34]/10 flex items-center justify-center font-bold text-[#1A3C34] flex-shrink-0">
                                    {(player.display_name || player.username)[0].toUpperCase()}
                                </div>

                                {/* Name */}
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-[#1A3C34] truncate">
                                        {player.display_name || player.username}
                                        {isMe && <span className="ml-2 text-xs text-[#8A8A8A]">(you)</span>}
                                    </div>
                                    {player.is_dnf && <div className="text-xs text-red-500">Did not finish</div>}
                                </div>

                                {/* Score */}
                                <div className="flex items-center gap-4 flex-shrink-0">
                                    <div className="text-right">
                                        <div className="text-2xl font-bold font-mono text-[#1A3C34]">{player.net_score ?? '-'}</div>
                                        <div className="text-xs text-[#8A8A8A]">
                                            <span className="text-green-600">{player.gross_score ?? 0} raw</span>
                                            {' · '}
                                            <span className="text-[#8A8A8A]">{player.words_found?.length ?? 0} words</span>
                                        </div>
                                    </div>
                                    {expanded ? <TbChevronUp className="w-4 h-4 text-[#8A8A8A]" /> : <TbChevronDown className="w-4 h-4 text-[#8A8A8A]" />}
                                </div>
                            </button>

                            {/* Expanded word lists */}
                            {expanded && (
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: 'auto' }}
                                    className="px-5 pb-4 border-t border-[#E6E4DD] pt-4 space-y-3"
                                >
                                    <WordList words={player.words_found} label="Found" color="text-green-600" />
                                    <WordList words={player.words_penalized} label="Penalized" color="text-red-500" />
                                    {(!player.words_found || player.words_found.length === 0) && (!player.words_penalized || player.words_penalized.length === 0) && (
                                        <div className="text-sm text-[#8A8A8A] italic">No words submitted.</div>
                                    )}
                                </motion.div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
                {isHost && (
                    <button
                        onClick={onPlayAgain}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1A3C34] text-[#F9F7F1] rounded-xl font-semibold hover:bg-[#142E28] transition-all"
                    >
                        <TbRefresh className="w-4 h-4" />
                        Play Again
                    </button>
                )}
                <button
                    onClick={onLeave}
                    className="flex-1 flex items-center justify-center gap-2 py-3 border border-[#E6E4DD] text-[#666] rounded-xl font-semibold hover:border-red-300 hover:text-red-600 transition-all"
                >
                    <TbDoorExit className="w-4 h-4" />
                    Leave
                </button>
            </div>
        </div>
    );
}
