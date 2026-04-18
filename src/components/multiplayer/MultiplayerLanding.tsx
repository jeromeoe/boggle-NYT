"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { TbPlus, TbUsers, TbArrowRight, TbLoader2, TbSword } from "react-icons/tb";
import { FriendsPanel } from "./FriendsPanel";
import type { User } from "@/lib/supabase/client";

interface Props {
    user: User | null;
    onCreateRoom: () => Promise<void>;
    onJoinRoom: (code: string) => Promise<void>;
    onSignInClick: () => void;
    isLoading: boolean;
    error: string | null;
}

export function MultiplayerLanding({ user, onCreateRoom, onJoinRoom, onSignInClick, isLoading, error }: Props) {
    const [joinView, setJoinView] = useState(false);
    const [code, setCode] = useState(["", "", "", ""]);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

    const handleCodeChange = (i: number, value: string) => {
        const char = value.replace(/[^a-zA-Z0-9]/g, "").slice(-1).toUpperCase();
        const next = [...code];
        next[i] = char;
        setCode(next);
        if (char && i < 3) inputRefs.current[i + 1]?.focus();
    };

    const handleCodeKeyDown = (i: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !code[i] && i > 0) {
            inputRefs.current[i - 1]?.focus();
        }
    };

    const handleJoin = async () => {
        const full = code.join("");
        if (full.length !== 4) return;
        await onJoinRoom(full);
    };

    const codeComplete = code.every(c => c !== "");

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 w-full max-w-5xl mx-auto">

            {/* Left: Play actions */}
            <div className="lg:col-span-3 flex flex-col gap-5">
                {/* Page title */}
                <div>
                    <h1 className="text-2xl font-serif font-bold text-[#1A3C34]">Multiplayer</h1>
                    <p className="text-sm text-[#8A9A90] mt-0.5">Compete in real-time word duels</p>
                </div>

                {error && (
                    <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Action cards */}
                {!joinView ? (
                    <div className="flex flex-col gap-3">
                        {/* Create room */}
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={onCreateRoom}
                            disabled={isLoading || !user}
                            className="w-full flex items-center justify-between px-6 py-5 bg-[#1A3C34] text-[#F9F7F1] rounded-2xl font-semibold hover:bg-[#142E28] transition-all disabled:opacity-50 shadow-md"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                    <TbPlus className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <div className="text-base font-bold">Create Room</div>
                                    <div className="text-xs text-[#8A9A90] font-normal mt-0.5">Host a private game with a code</div>
                                </div>
                            </div>
                            {isLoading ? <TbLoader2 className="w-5 h-5 animate-spin" /> : <TbArrowRight className="w-5 h-5" />}
                        </motion.button>

                        {/* Join room */}
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => setJoinView(true)}
                            disabled={isLoading || !user}
                            className="w-full flex items-center justify-between px-6 py-5 bg-white border-2 border-[#E6E4DD] text-[#1A3C34] rounded-2xl font-semibold hover:border-[#1A3C34] transition-all disabled:opacity-50"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-[#1A3C34]/5 flex items-center justify-center">
                                    <TbUsers className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <div className="text-base font-bold">Join Room</div>
                                    <div className="text-xs text-[#8A8A8A] font-normal mt-0.5">Enter a 4-character room code</div>
                                </div>
                            </div>
                            <TbArrowRight className="w-5 h-5" />
                        </motion.button>

                        {/* Ranked — coming soon */}
                        <motion.div
                            className="w-full flex items-center justify-between px-6 py-5 bg-[#F0EEE8] border-2 border-dashed border-[#D4AF37]/40 text-[#8A9A90] rounded-2xl cursor-not-allowed"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
                                    <TbSword className="w-5 h-5 text-[#D4AF37]" />
                                </div>
                                <div className="text-left">
                                    <div className="text-base font-bold text-[#1A3C34]/40">Ranked Match</div>
                                    <div className="text-xs font-normal mt-0.5">Matchmaking queue — coming soon</div>
                                </div>
                            </div>
                            <span className="text-[10px] font-mono uppercase tracking-widest bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-1 rounded-full">Soon</span>
                        </motion.div>

                        {!user && (
                            <p className="text-center text-sm text-[#8A9A90]">
                                <button onClick={onSignInClick} className="text-[#1A3C34] font-semibold hover:underline">Sign in</button>
                                {" "}to play multiplayer
                            </p>
                        )}
                    </div>
                ) : (
                    /* Join code input */
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-[#E6E4DD] rounded-2xl p-6 flex flex-col gap-5"
                    >
                        <button
                            onClick={() => { setJoinView(false); setCode(["", "", "", ""]); }}
                            className="text-sm text-[#666] hover:text-[#1A3C34] transition-colors self-start"
                        >
                            ← Back
                        </button>

                        <div>
                            <p className="text-sm font-semibold text-[#1A3C34] mb-4">Enter room code</p>
                            <div className="flex gap-3 justify-center">
                                {code.map((char, i) => (
                                    <input
                                        key={i}
                                        ref={el => { inputRefs.current[i] = el; }}
                                        value={char}
                                        onChange={e => handleCodeChange(i, e.target.value)}
                                        onKeyDown={e => handleCodeKeyDown(i, e)}
                                        maxLength={2}
                                        className="w-16 h-16 text-center text-2xl font-mono font-bold border-2 border-[#E6E4DD] rounded-xl focus:border-[#1A3C34] focus:outline-none bg-white text-[#1A3C34] uppercase transition-colors"
                                        autoFocus={i === 0}
                                    />
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleJoin}
                            disabled={!codeComplete || isLoading}
                            className="w-full py-3.5 bg-[#1A3C34] text-[#F9F7F1] rounded-xl font-semibold hover:bg-[#142E28] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                            {isLoading && <TbLoader2 className="w-4 h-4 animate-spin" />}
                            Join Game
                        </button>
                    </motion.div>
                )}
            </div>

            {/* Right: Friends panel */}
            <div className="lg:col-span-2">
                <div className="bg-white border border-[#E6E4DD] rounded-2xl overflow-hidden h-full min-h-[400px] flex flex-col">
                    <FriendsPanel user={user} onSignInClick={onSignInClick} />
                </div>
            </div>
        </div>
    );
}
