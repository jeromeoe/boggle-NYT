"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TbBrain, TbFlame, TbSparkles } from 'react-icons/tb';
import { generatePracticeQuiz, PracticeQuiz } from '@/lib/boggle/practice';
import { PracticeQuizComponent } from '@/components/practice/PracticeQuiz';
import { loadDictionary } from '@/lib/boggle/trie';

export function PracticeMode() {
    const [trie, setTrie] = useState<any>(null);
    const [currentQuiz, setCurrentQuiz] = useState<PracticeQuiz | null>(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

    // Load dictionary on mount
    useEffect(() => {
        loadDictionary().then(({ trie: loadedTrie }) => {
            setTrie(loadedTrie);
        });
    }, []);

    const startNewQuiz = (difficulty: 'easy' | 'medium' | 'hard') => {
        if (!trie) return;

        setSelectedDifficulty(difficulty);
        const quiz = generatePracticeQuiz(trie, difficulty);
        setCurrentQuiz(quiz);
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
        return (
            <div className="w-full max-w-4xl mx-auto py-12 px-4 space-y-8">
                <div className="text-center space-y-4">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    >
                        <TbBrain className="w-20 h-20 mx-auto text-[#1A3C34] mb-4" />
                    </motion.div>
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#1A3C34]">
                        Practice Mode
                    </h1>
                    <p className="text-lg text-[#666] max-w-2xl mx-auto">
                        Master small words with 2×2 grid challenges. Find all valid word combinations to improve your Boggle skills!
                    </p>
                </div>

                {/* Difficulty Selection */}
                <div className="grid md:grid-cols-3 gap-6 mt-12">
                    <motion.button
                        onClick={() => startNewQuiz('easy')}
                        whileHover={{ scale: 1.05, y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-2xl p-8 text-left shadow-lg hover:shadow-xl transition-all group"
                    >
                        <TbSparkles className="w-12 h-12 text-green-600 mb-4 group-hover:rotate-12 transition-transform" />
                        <h3 className="text-2xl font-serif font-bold text-green-700 mb-2">Easy</h3>
                        <p className="text-sm text-green-600 mb-4">3-8 words per quiz</p>
                        <p className="text-xs text-green-600/80">Perfect for beginners learning common 3-4 letter words</p>
                    </motion.button>

                    <motion.button
                        onClick={() => startNewQuiz('medium')}
                        whileHover={{ scale: 1.05, y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-2xl p-8 text-left shadow-lg hover:shadow-xl transition-all group"
                    >
                        <TbBrain className="w-12 h-12 text-yellow-600 mb-4 group-hover:rotate-12 transition-transform" />
                        <h3 className="text-2xl font-serif font-bold text-yellow-700 mb-2">Medium</h3>
                        <p className="text-sm text-yellow-600 mb-4">8-15 words per quiz</p>
                        <p className="text-xs text-yellow-600/80">Balanced challenge for intermediate players</p>
                    </motion.button>

                    <motion.button
                        onClick={() => startNewQuiz('hard')}
                        whileHover={{ scale: 1.05, y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-2xl p-8 text-left shadow-lg hover:shadow-xl transition-all group"
                    >
                        <TbFlame className="w-12 h-12 text-red-600 mb-4 group-hover:rotate-12 transition-transform" />
                        <h3 className="text-2xl font-serif font-bold text-red-700 mb-2">Hard</h3>
                        <p className="text-sm text-red-600 mb-4">15-30 words per quiz</p>
                        <p className="text-xs text-red-600/80">Advanced grids with many possible combinations</p>
                    </motion.button>
                </div>

                {/* Tips Section */}
                <div className="bg-white rounded-2xl p-6 shadow-md border border-[#E6E4DD] mt-12">
                    <h3 className="text-lg font-serif font-bold text-[#1A3C34] mb-4">💡 Practice Tips</h3>
                    <ul className="space-y-2 text-sm text-[#666]">
                        <li className="flex items-start gap-2">
                            <span className="text-[#D4AF37] mt-1">•</span>
                            <span>Words must be at least 3 letters long</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-[#D4AF37] mt-1">•</span>
                            <span>You can move to any adjacent tile (including diagonals)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-[#D4AF37] mt-1">•</span>
                            <span>Each tile can only be used once per word</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-[#D4AF37] mt-1">•</span>
                            <span>Use "Reveal" if you're stuck to see all possible words</span>
                        </li>
                    </ul>
                </div>
            </div>
        );
    }

    return <PracticeQuizComponent quiz={currentQuiz} onNewQuiz={startNewQuiz} />;
}
