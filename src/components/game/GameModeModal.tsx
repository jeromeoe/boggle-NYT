"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TbX, TbDice, TbLock, TbLayoutGrid, TbBolt, TbGridDots } from "react-icons/tb";

export type GameMode = "open" | "closed" | "random";

interface GameModeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectMode: (mode: GameMode) => void;
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
        description: "High-density board. Many paths, many words. Great for warming up or chasing a high score.",
        icon: TbLayoutGrid,
    },
    {
        id: "closed",
        label: "Closed Board",
        badge: "< 50 words",
        description: "Sparse board with few valid words. Every letter matters. Expert-level challenge.",
        icon: TbLock,
    },
    {
        id: "random",
        label: "Random",
        badge: "Unpredictable",
        description: "Pure dice roll. No filters. Could be easy, could be brutal. The classic experience.",
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

export function GameModeModal({ isOpen, onClose, onSelectMode, isGenerating }: GameModeModalProps) {
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
                        {/* Gold accent line */}
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

                        {/* Header */}
                        <div className="bg-gradient-to-br from-[#1A3C34] to-[#0F2016] p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-mono text-[#8A9A90] uppercase tracking-widest mb-1">
                                        Classic Boggle
                                    </p>
                                    <h2 className="text-2xl font-serif font-bold text-[#F9F7F1]">
                                        Choose Board Type
                                    </h2>
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
                        </div>

                        {/* Mode cards */}
                        <div className="p-6 space-y-3">
                            {CLASSIC_MODES.map((mode, index) => {
                                const Icon = mode.icon;
                                return (
                                    <motion.button
                                        key={mode.id}
                                        initial={{ opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.06 }}
                                        onClick={() => !isGenerating && onSelectMode(mode.id)}
                                        disabled={isGenerating}
                                        className={`
                                            w-full flex items-start gap-4 p-4 rounded-xl border text-left
                                            transition-all group
                                            ${isGenerating
                                                ? "opacity-50 cursor-not-allowed bg-white border-[#E6E4DD]"
                                                : "bg-white border-[#E6E4DD] hover:border-[#1A3C34] hover:shadow-md active:scale-[0.99] cursor-pointer"
                                            }
                                        `}
                                    >
                                        <div className={`
                                            mt-0.5 p-2 rounded-lg shrink-0 transition-colors
                                            ${isGenerating ? "bg-[#F0EDE6]" : "bg-[#F0EDE6] group-hover:bg-[#1A3C34]/10"}
                                        `}>
                                            <Icon className="w-5 h-5 text-[#1A3C34]" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-[#1A3C34]">
                                                    {mode.label}
                                                </span>
                                                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-[#1A3C34]/10 text-[#1A3C34] rounded-full">
                                                    {mode.badge}
                                                </span>
                                            </div>
                                            <p className="text-sm text-[#666] leading-snug">
                                                {mode.description}
                                            </p>
                                        </div>

                                        {!isGenerating && (
                                            <div className="self-center text-[#C0C0C0] group-hover:text-[#1A3C34] transition-colors shrink-0">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </motion.button>
                                );
                            })}

                            {/* Generating state overlay */}
                            {isGenerating && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center justify-center gap-3 py-3 text-[#1A3C34]"
                                >
                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    <span className="text-sm font-mono tracking-wider">Generating board...</span>
                                </motion.div>
                            )}

                            {/* Divider + Coming Soon */}
                            <div className="pt-3 border-t border-[#E6E4DD]">
                                <p className="text-[10px] font-mono uppercase tracking-widest text-[#AAAAAA] mb-3">
                                    Coming Soon
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {COMING_SOON.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <div
                                                key={item.label}
                                                className="flex items-start gap-3 p-3 rounded-xl border border-dashed border-[#E6E4DD] opacity-50 cursor-not-allowed"
                                            >
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
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
