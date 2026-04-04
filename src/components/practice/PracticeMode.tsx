"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TbBrain, TbFlame, TbSparkles } from 'react-icons/tb';
import { generatePracticeQuiz, PracticeQuiz } from '@/lib/boggle/practice';
import { PracticeQuizComponent } from '@/components/practice/PracticeQuiz';
import { loadDictionary } from '@/lib/boggle/trie';
import type { Trie } from '@/lib/boggle/trie';

export function PracticeMode() {
    const [trie, setTrie] = useState<Trie | null>(null);
    const [currentQuiz, setCurrentQuiz] = useState<PracticeQuiz | null>(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('medium');

    // Load dictionary on mount
    useEffect(() => {
        let isMounted = true;
        loadDictionary().then(({ trie: loadedTrie }) => {
            if (isMounted) {
                setTrie(loadedTrie);
            }
        });
        return () => { isMounted = false; };
    }, []);

    const startNewQuiz = (difficulty: 'easy' | 'medium' | 'hard' | 'mixed') => {
        if (!trie) return;

        setSelectedDifficulty(difficulty);
        const quiz = generatePracticeQuiz(trie, difficulty);
        setCurrentQuiz(quiz);
    };

    const handleBack = () => {
        setCurrentQuiz(null);
    };

    if (!trie) {
        return (
            <div className="min-h-screen bg-[#F9F7F1] text-[#1A1A1A] flex flex-col items-center justify-center">
                <div className="animate-pulse text-2xl tracking-widest mb-4 font-serif">LOADING PRACTICE MODE...</div>
                <div className="text-sm font-mono text-[#8A8A8A]">Preparing Dictionary</div>
            </div>
        );
    }

    if (!currentQuiz) {
        const difficulties = [
            { key: 'easy' as const, label: 'Easy', desc: '3 \u2013 8 words', icon: <TbSparkles className="w-5 h-5" /> },
            { key: 'medium' as const, label: 'Medium', desc: '8 \u2013 15 words', icon: <TbBrain className="w-5 h-5" /> },
            { key: 'hard' as const, label: 'Hard', desc: '15 \u2013 30 words', icon: <TbFlame className="w-5 h-5" /> },
            { key: 'mixed' as const, label: 'Mixed', desc: 'Random grids', icon: <TbSparkles className="w-5 h-5" /> },
        ];

        return (
            <div className="w-full max-w-xl mx-auto pt-16 pb-12 px-4">
                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-3xl font-serif font-bold text-[#1A3C34] tracking-tight">Practice</h1>
                    <p className="text-sm text-[#8A8A8A] mt-2">
                        2x2 grids. Find every word. Build your eye for the board.
                    </p>
                </div>

                {/* Difficulty cards */}
                <div className="space-y-3">
                    {difficulties.map((d, i) => (
                        <motion.button
                            key={d.key}
                            onClick={() => startNewQuiz(d.key)}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            whileTap={{ scale: 0.98 }}
                            className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all
                                ${selectedDifficulty === d.key
                                    ? 'border-[#1A3C34] bg-[#1A3C34] text-[#F9F7F1]'
                                    : 'border-[#E6E4DD] bg-white text-[#1A3C34] hover:border-[#1A3C34]'
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                                ${selectedDifficulty === d.key ? 'bg-white/15' : 'bg-[#1A3C34]/5'}`}>
                                {d.icon}
                            </div>
                            <div className="flex-1">
                                <div className="font-semibold text-sm">{d.label}</div>
                                <div className={`text-xs ${selectedDifficulty === d.key ? 'text-[#8A9A90]' : 'text-[#8A8A8A]'}`}>
                                    {d.desc}
                                </div>
                            </div>
                        </motion.button>
                    ))}
                </div>

                {/* Rules — compact, no emoji */}
                <div className="mt-10 pt-8 border-t border-[#E6E4DD]">
                    <div className="text-xs font-mono uppercase tracking-widest text-[#8A8A8A] mb-4">How it works</div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-[#555]">
                        <div>Words must be 3+ letters</div>
                        <div>Adjacent tiles only (incl. diagonals)</div>
                        <div>Each tile used once per word</div>
                        <div>Press Space to reveal a word</div>
                    </div>
                </div>
            </div>
        );
    }

    return <PracticeQuizComponent quiz={currentQuiz} onNewQuiz={startNewQuiz} onBack={handleBack} />;
}
