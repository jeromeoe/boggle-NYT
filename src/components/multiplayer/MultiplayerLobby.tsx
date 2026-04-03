"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TbCopy, TbCheck, TbCrown, TbUsers, TbLoader2 } from "react-icons/tb";
import { useState } from "react";
import type { MultiplayerRoom, MultiplayerPlayer } from "@/lib/multiplayer/types";

interface Props {
    room: MultiplayerRoom;
    players: MultiplayerPlayer[];
    myUserId: string;
    isHost: boolean;
    isLoading: boolean;
    onStart: () => void;
    onLeave: () => void;
}

export function MultiplayerLobby({ room, players, myUserId, isHost, isLoading, onStart, onLeave }: Props) {
    const [copied, setCopied] = useState(false);

    const copyCode = () => {
        navigator.clipboard.writeText(room.room_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const canStart = isHost && players.length >= 2;

    return (
        <div className="w-full max-w-md mx-auto space-y-6">
            {/* Room code card */}
            <div className="bg-white border border-[#E6E4DD] rounded-2xl p-6 text-center shadow-sm">
                <div className="text-xs font-mono uppercase tracking-widest text-[#8A8A8A] mb-2">Room Code</div>
                <div className="flex items-center justify-center gap-4">
                    <span className="text-5xl font-mono font-bold tracking-[0.25em] text-[#1A3C34]">
                        {room.room_code}
                    </span>
                    <button
                        onClick={copyCode}
                        className="p-2 rounded-lg border border-[#E6E4DD] hover:border-[#1A3C34] text-[#666] hover:text-[#1A3C34] transition-all"
                        title="Copy code"
                    >
                        {copied ? <TbCheck className="w-5 h-5 text-green-600" /> : <TbCopy className="w-5 h-5" />}
                    </button>
                </div>
                <div className="text-sm text-[#8A8A8A] mt-3">Share this code with friends to join</div>
            </div>

            {/* Player list */}
            <div className="bg-white border border-[#E6E4DD] rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-[#E6E4DD] flex items-center gap-2">
                    <TbUsers className="w-4 h-4 text-[#1A3C34]" />
                    <span className="text-sm font-semibold text-[#1A3C34]">Players ({players.length}/8)</span>
                </div>

                <div className="divide-y divide-[#F0EEE8]">
                    <AnimatePresence initial={false}>
                        {players.map(player => (
                            <motion.div
                                key={player.user_id}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-center justify-between px-5 py-3"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#1A3C34]/10 flex items-center justify-center text-[#1A3C34] font-bold text-sm">
                                        {(player.display_name || player.username)[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-[#1A3C34] text-sm">
                                            {player.display_name || player.username}
                                        </div>
                                        <div className="text-xs text-[#8A8A8A]">@{player.username}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {player.user_id === myUserId && (
                                        <span className="text-xs bg-[#1A3C34]/10 text-[#1A3C34] px-2 py-0.5 rounded-full font-medium">You</span>
                                    )}
                                    {player.user_id === room.host_user_id && (
                                        <TbCrown className="w-4 h-4 text-[#D4AF37]" title="Host" />
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
                {isHost ? (
                    <button
                        onClick={onStart}
                        disabled={!canStart || isLoading}
                        className="w-full py-4 bg-[#1A3C34] text-[#F9F7F1] rounded-xl font-bold text-base hover:bg-[#142E28] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <TbLoader2 className="w-5 h-5 animate-spin" /> : null}
                        {canStart ? 'Start Game' : `Waiting for players… (${players.length}/2 min)`}
                    </button>
                ) : (
                    <div className="w-full py-4 bg-[#F0EEE8] text-[#666] rounded-xl font-semibold text-sm text-center">
                        Waiting for host to start…
                    </div>
                )}

                <button
                    onClick={onLeave}
                    className="w-full py-3 border border-[#E6E4DD] text-[#666] rounded-xl font-semibold text-sm hover:border-red-300 hover:text-red-600 transition-all"
                >
                    Leave Room
                </button>
            </div>
        </div>
    );
}
