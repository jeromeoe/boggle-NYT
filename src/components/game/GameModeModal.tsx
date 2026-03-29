"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TbX, TbDice, TbLock, TbLayoutGrid, TbBolt, TbGridDots, TbArrowLeft, TbPencil } from "react-icons/tb";

export type GameMode = "open" | "closed" | "random";

interface GameModeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectMode: (mode: GameMode) => void;
    onSelectCustom: (letters: string) => void;
    isGenerating: boolean;
}

const CLASSIC_MODES: {
    id: GameMode;
    label: string;
    badge: string;
    description: string;
    icon: React.ElementType;
}[] = [
        {
            id: "open",
            label: "Open Board",
            badge: "≥ 180 words",
            description: "High density board for speed work.",
            icon: TbLayoutGrid,
        },
        {
            id: "closed",
            label: "Closed Board",
            badge: "< 50 words",
            description: "Sparse board for focused memory work.",
            icon: TbLock,
        },
        {
            id: "random",
            label: "Random",
            badge: "Unpredictable",
            description: "Surprise yourself!",
            icon: TbDice,
        },
    ];

const COMING_SOON = [
    {
        label: "Blitz Mode",
        description: "Every word found adds time. Survive as long as possible.",
        icon: TbBolt,
    },
    {
        label: "Big Boggle",
        description: "5×5 grid, longer words, higher scores.",
        icon: TbGridDots,
    },
];

export function GameModeModal({
    isOpen,
    onClose,
    onSelectMode,
    onSelectCustom,
    isGenerating,
}: GameModeModalProps) {
    const [view, setView] = useState<"modes" | "custom">("modes");
    const [letters, setLetters] = useState<string[]>(Array(16).fill(""));
    const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(16).fill(null));

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setView("modes");
            setLetters(Array(16).fill(""));
        }
    }, [isOpen]);

    const filledCount = letters.filter(Boolean).length;
    const allFilled = filledCount === 16;

    const handleLetterChange = (i: number, raw: string) => {
        const letter = raw.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(-1);
        const next = [...letters];
        next[i] = letter;
        setLetters(next);
        if (letter && i < 15) {
            inputRefs.current[i + 1]?.focus();
        }
    };

    const handleLetterKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace") {
            if (letters[i]) {
                const next = [...letters];
                next[i] = "";
                setLetters(next);
            } else if (i > 0) {
                inputRefs.current[i - 1]?.focus();
            }
        } else if (e.key === "ArrowLeft" && i > 0) {
            inputRefs.current[i - 1]?.focus();
        } else if (e.key === "ArrowRight" && i < 15) {
            inputRefs.current[i + 1]?.focus();
        }
    };

    const handleStartCustom = () => {
        if (!allFilled) return;
        onSelectCustom(letters.join(""));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#1A3C34]/60 backdrop-blur-sm"
                        onClick={!isGenerating ? onClose : undefined}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="relative bg-[#F9F7F1] w-full max-w-lg rounded-xl shadow-2xl border border-[#E6E4DD] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-[#1A3C34] px-6 py-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {view === "custom" && (
                                    <button
                                        onClick={() => setView("modes")}
                                        className="p-1 rounded-lg hover:bg-white/10 text-[#F9F7F1] transition-colors"
                                    >
                                        <TbArrowLeft className="w-5 h-5" />
                                    </button>
                                )}
                                <div>
                                    <p className="text-[10px] font-mono text-[#8A9A90] uppercase tracking-widest">
                                        {view === "modes" ? "Classic Boggle" : "Custom Board"}
                                    </p>
                                    <h2 className="text-xl font-serif font-bold text-[#F9F7F1]">
                                        {view === "modes" ? "Choose Board Type" : "Enter Your Letters"}
                                    </h2>
                                </div>
                            </div>
                            {!isGenerating && (
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg hover:bg-white/10 text-[#F9F7F1] transition-colors"
                                >
                                    <TbX className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        {/* ── Mode selection view ── */}
                        {view === "modes" && (
                            <div className="p-5 space-y-2">
                                {/* Regular mode cards */}
                                {CLASSIC_MODES.map((mode, index) => {
                                    const Icon = mode.icon;
                                    return (
                                        <motion.button
                                            key={mode.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            onClick={() => !isGenerating && onSelectMode(mode.id)}
                                            disabled={isGenerating}
                                            className="w-full flex items-center gap-4 p-4 rounded-xl border border-[#E6E4DD] bg-white text-left transition-all group hover:border-[#1A3C34] hover:shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <div className="p-2 rounded-lg bg-[#F0EDE6] shrink-0 group-hover:bg-[#1A3C34]/10 transition-colors">
                                                <Icon className="w-5 h-5 text-[#1A3C34]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="font-semibold text-[#1A3C34]">{mode.label}</span>
                                                    <span className="text-[10px] font-mono px-2 py-0.5 bg-[#1A3C34]/10 text-[#1A3C34] rounded-full">
                                                        {mode.badge}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-[#666]">{mode.description}</p>
                                            </div>
                                            <svg className="w-4 h-4 text-[#C0C0C0] group-hover:text-[#1A3C34] shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </motion.button>
                                    );
                                })}

                                {/* Custom board card */}
                                <motion.button
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.15 }}
                                    onClick={() => !isGenerating && setView("custom")}
                                    disabled={isGenerating}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-[#E6E4DD] bg-white text-left transition-all group hover:border-[#1A3C34] hover:shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="p-2 rounded-lg bg-[#F0EDE6] shrink-0 group-hover:bg-[#1A3C34]/10 transition-colors">
                                        <TbPencil className="w-5 h-5 text-[#1A3C34]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-semibold text-[#1A3C34]">Custom</span>
                                            <span className="text-[10px] font-mono px-2 py-0.5 bg-[#1A3C34]/10 text-[#1A3C34] rounded-full">
                                                Your board
                                            </span>
                                        </div>
                                        <p className="text-sm text-[#666]">Play your own board.</p>
                                    </div>
                                    <svg className="w-4 h-4 text-[#C0C0C0] group-hover:text-[#1A3C34] shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </motion.button>

                                {/* Generating spinner */}
                                {isGenerating && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex items-center justify-center gap-3 py-2 text-[#1A3C34]"
                                    >
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        <span className="text-sm font-mono tracking-wider">Generating board...</span>
                                    </motion.div>
                                )}

                                {/* Coming Soon */}
                                <div className="pt-3 border-t border-[#E6E4DD]">
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-[#AAAAAA] mb-2">Coming Soon</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {COMING_SOON.map((item) => {
                                            const Icon = item.icon;
                                            return (
                                                <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl border border-dashed border-[#E6E4DD] opacity-40 cursor-not-allowed">
                                                    <Icon className="w-4 h-4 text-[#8A8A8A] mt-0.5 shrink-0" />
                                                    <div>
                                                        <div className="text-xs font-semibold text-[#666]">{item.label}</div>
                                                        <div className="text-[10px] text-[#AAAAAA] leading-snug mt-0.5">{item.description}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Custom board editor view ── */}
                        {view === "custom" && (
                            <div className="p-6 space-y-5">
                                {/* 4×4 grid */}
                                <div className="grid grid-cols-4 gap-2.5 mx-auto w-fit">
                                    {letters.map((letter, i) => (
                                        <input
                                            key={i}
                                            ref={(el) => { inputRefs.current[i] = el; }}
                                            type="text"
                                            value={letter}
                                            onChange={(e) => handleLetterChange(i, e.target.value)}
                                            onKeyDown={(e) => handleLetterKeyDown(i, e)}
                                            onFocus={(e) => e.target.select()}
                                            maxLength={2}
                                            className={`
                                                w-14 h-14 text-center text-xl font-serif font-bold uppercase
                                                border-2 rounded-lg focus:outline-none transition-all
                                                ${letter
                                                    ? "bg-[#1A3C34] border-[#1A3C34] text-[#F9F7F1]"
                                                    : "bg-white border-[#E6E4DD] text-[#CCCCCC] focus:border-[#1A3C34]"
                                                }
                                            `}
                                            placeholder="·"
                                        />
                                    ))}
                                </div>

                                {/* Counter + hint */}
                                <div className="text-center space-y-1">
                                    <p className="text-sm font-mono text-[#8A8A8A]">
                                        <span className={allFilled ? "text-[#1A3C34] font-bold" : ""}>{filledCount}</span>
                                        <span className="text-[#CCCCCC]">/16</span>
                                        {" "}letters entered
                                    </p>
                                    <p className="text-xs text-[#AAAAAA]">Q is treated as QU</p>
                                </div>

                                {/* Start button */}
                                <button
                                    onClick={handleStartCustom}
                                    disabled={!allFilled}
                                    className="w-full py-3.5 bg-[#1A3C34] text-[#F9F7F1] font-serif font-semibold text-lg rounded-lg transition-all shadow-md active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#142E28]"
                                >
                                    Play Custom Board
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
