"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TbX, TbUsers, TbPlus, TbArrowRight, TbLoader2 } from "react-icons/tb";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onCreateRoom: () => Promise<void>;
    onJoinRoom: (code: string) => Promise<void>;
    isLoading: boolean;
    error: string | null;
}

type View = "menu" | "join";

export function MultiplayerEntryModal({ isOpen, onClose, onCreateRoom, onJoinRoom, isLoading, error }: Props) {
    const [view, setView] = useState<View>("menu");
    const [code, setCode] = useState(["", "", "", ""]);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

    const handleCodeChange = (i: number, value: string) => {
        const char = value.replace(/[^a-zA-Z0-9]/g, '').slice(-1).toUpperCase();
        const next = [...code];
        next[i] = char;
        setCode(next);
        if (char && i < 3) inputRefs.current[i + 1]?.focus();
    };

    const handleCodeKeyDown = (i: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[i] && i > 0) {
            inputRefs.current[i - 1]?.focus();
        }
    };

    const handleJoin = async () => {
        const full = code.join('');
        if (full.length !== 4) return;
        await onJoinRoom(full);
    };

    const codeComplete = code.every(c => c !== '');

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

                <motion.div
                    className="relative w-full max-w-sm bg-[#F9F7F1] rounded-2xl shadow-2xl border border-[#E6E4DD] overflow-hidden"
                    initial={{ scale: 0.95, opacity: 0, y: 8 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-[#E6E4DD]">
                        <div className="flex items-center gap-3">
                            <TbUsers className="w-5 h-5 text-[#1A3C34]" />
                            <span className="font-serif font-bold text-[#1A3C34] tracking-tight text-lg">Multiplayer</span>
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#E6E4DD] text-[#666] transition-colors">
                            <TbX className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        {error && (
                            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        {view === "menu" && (
                            <div className="space-y-3">
                                <button
                                    onClick={onCreateRoom}
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-between px-5 py-4 bg-[#1A3C34] text-[#F9F7F1] rounded-xl font-semibold hover:bg-[#142E28] transition-all disabled:opacity-60"
                                >
                                    <div className="flex items-center gap-3">
                                        <TbPlus className="w-5 h-5" />
                                        <div className="text-left">
                                            <div>Create Room</div>
                                            <div className="text-xs text-[#8A9A90] font-normal">Get a shareable code</div>
                                        </div>
                                    </div>
                                    {isLoading ? <TbLoader2 className="w-4 h-4 animate-spin" /> : <TbArrowRight className="w-4 h-4" />}
                                </button>

                                <button
                                    onClick={() => setView("join")}
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-between px-5 py-4 bg-white border border-[#E6E4DD] text-[#1A3C34] rounded-xl font-semibold hover:border-[#1A3C34] transition-all disabled:opacity-60"
                                >
                                    <div className="flex items-center gap-3">
                                        <TbUsers className="w-5 h-5" />
                                        <div className="text-left">
                                            <div>Join Room</div>
                                            <div className="text-xs text-[#8A8A8A] font-normal">Enter a 4-letter code</div>
                                        </div>
                                    </div>
                                    <TbArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {view === "join" && (
                            <div className="space-y-4">
                                <button
                                    onClick={() => { setView("menu"); setCode(["", "", "", ""]); }}
                                    className="text-sm text-[#666] hover:text-[#1A3C34] transition-colors"
                                >
                                    ← Back
                                </button>

                                <div>
                                    <div className="text-sm font-semibold text-[#1A3C34] mb-3">Enter room code</div>
                                    <div className="flex gap-3 justify-center">
                                        {code.map((char, i) => (
                                            <input
                                                key={i}
                                                ref={el => { inputRefs.current[i] = el; }}
                                                value={char}
                                                onChange={e => handleCodeChange(i, e.target.value)}
                                                onKeyDown={e => handleCodeKeyDown(i, e)}
                                                maxLength={2}
                                                className="w-14 h-14 text-center text-2xl font-mono font-bold border-2 border-[#E6E4DD] rounded-xl focus:border-[#1A3C34] focus:outline-none bg-white text-[#1A3C34] uppercase transition-colors"
                                                autoFocus={i === 0}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleJoin}
                                    disabled={!codeComplete || isLoading}
                                    className="w-full py-3 bg-[#1A3C34] text-[#F9F7F1] rounded-xl font-semibold hover:bg-[#142E28] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <TbLoader2 className="w-4 h-4 animate-spin" /> : null}
                                    Join Game
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
