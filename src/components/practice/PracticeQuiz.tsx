"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TbCheck, TbX, TbEye, TbRefresh, TbTrophy, TbArrowLeft } from 'react-icons/tb';
import { PracticeQuiz } from '@/lib/boggle/practice';

interface PracticeQuizProps {
    quiz: PracticeQuiz;
    onNewQuiz: (difficulty: 'easy' | 'medium' | 'hard' | 'mixed') => void;
    onBack: () => void;
}

export function PracticeQuizComponent({ quiz, onNewQuiz, onBack }: PracticeQuizProps) {
    const [input, setInput] = useState('');
    const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
    const [showAnswers, setShowAnswers] = useState(false);
    const [lastSubmitStatus, setLastSubmitStatus] = useState<'valid' | 'invalid' | 'duplicate' | null>(null);
    const [isShaking, setIsShaking] = useState(false);

    // Reset state when quiz changes
    useEffect(() => {
        setFoundWords(new Set());
        setInput('');
        setShowAnswers(false);
        setLastSubmitStatus(null);
        setIsShaking(false);
    }, [quiz]);

    const handleReveal = () => {
        if (!showAnswers) setShowAnswers(true);
    };

    // Hotkeys
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // "Space" to reveal (prevent default to stop typing space)
            if (e.code === 'Space') {
                e.preventDefault();
                handleReveal();
            }

            if (e.key === 'Enter') {
                const allFound = foundWords.size === quiz.validWords.size;
                if (showAnswers || allFound) {
                    e.preventDefault();
                    onNewQuiz(quiz.difficulty);
                }
            }

            if (e.key === 'Escape') {
                onBack();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showAnswers, foundWords.size, quiz.validWords.size, quiz.difficulty, onNewQuiz, onBack]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const word = input.trim().toUpperCase();

        if (word.length < 3) {
            setLastSubmitStatus('invalid');
            triggerShake();
            setInput(''); // Clear on invalid
            return;
        }

        if (foundWords.has(word)) {
            setLastSubmitStatus('duplicate');
            triggerShake();
            setInput(''); // Clear on duplicate
            return;
        }

        if (quiz.validWords.has(word)) {
            setFoundWords(new Set([...foundWords, word]));
            setInput('');
            setLastSubmitStatus('valid');
        } else {
            setLastSubmitStatus('invalid');
            triggerShake();
            setInput(''); // Clear on invalid
        }
    };

    const triggerShake = () => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
    };

    const progress = (foundWords.size / quiz.validWords.size) * 100;
    const allFound = foundWords.size === quiz.validWords.size;

    // Get missing words (sorted)
    const missingWords = Array.from(quiz.validWords)
        .filter(w => !foundWords.has(w))
        .sort((a, b) => a.length - b.length || a.localeCompare(b));

    const foundWordsArray = Array.from(foundWords).sort((a, b) => a.length - b.length || a.localeCompare(b));

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-[#666] hover:text-[#1A3C34] transition-colors text-sm font-semibold"
            >
                <TbArrowLeft className="w-4 h-4" />
                Back to Menu
            </button>

            {/* Header with difficulty and progress */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-xs font-mono uppercase tracking-widest ${quiz.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        quiz.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            quiz.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                                'bg-purple-100 text-purple-700'
                        }`}>
                        {quiz.difficulty}
                    </div>
                    <div className="text-sm text-[#666]">
                        {foundWords.size} / {quiz.validWords.size} words
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleReveal}
                        className="px-4 py-2 bg-[#8A8A8A] hover:bg-[#666] text-white rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors relative"
                        disabled={showAnswers}
                        title="Press Space"
                    >
                        <TbEye className="w-4 h-4" />
                        Reveal
                        <span className="hidden md:inline ml-1 text-[10px] opacity-70 bg-black/20 px-1 rounded">SPACE</span>
                    </button>
                    <button
                        onClick={() => onNewQuiz(quiz.difficulty)}
                        className="px-4 py-2 bg-[#1A3C34] hover:bg-[#142E28] text-white rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"
                        title="Press Enter when done"
                    >
                        <TbRefresh className="w-4 h-4" />
                        New Quiz
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-[#E6E4DD] rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-gradient-to-r from-[#1A3C34] to-[#D4AF37]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                />
            </div>

            {/* Complete Message */}
            <AnimatePresence>
                {allFound && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-gradient-to-br from-[#1A3C34] to-[#0F2016] rounded-2xl p-6 text-center text-white"
                    >
                        <TbTrophy className="w-12 h-12 mx-auto mb-3 text-[#D4AF37]" />
                        <div className="text-2xl font-serif font-bold mb-2">Perfect Score!</div>
                        <div className="text-sm text-[#8A9A90] mb-4">You found all {quiz.validWords.size} words!</div>
                        <div className="flex justify-center items-center gap-2 text-xs text-[#8A9A90]/70">
                            <span>Press</span>
                            <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-white">Enter</kbd>
                            <span>for next quiz</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2x2 Grid Display */}
            <div className="flex justify-center">
                <div className="grid grid-cols-2 gap-3 p-8 bg-white rounded-2xl shadow-xl border-2 border-[#E6E4DD]">
                    {quiz.grid.map((row, r) =>
                        row.map((letter, c) => (
                            <motion.div
                                key={`${r}-${c}`}
                                className="w-24 h-24 bg-gradient-to-br from-[#1A3C34] to-[#0F2016] rounded-xl flex items-center justify-center text-4xl font-serif font-bold text-white shadow-lg cursor-default"
                                whileHover={{ scale: 1.05 }}
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: r * 0.1 + c * 0.1 }}
                            >
                                {letter}
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* Input Form */}
            {!allFound && (
                <form onSubmit={handleSubmit} className="space-y-2">
                    <motion.div
                        className="relative"
                        animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
                        transition={{ duration: 0.4 }}
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value.toUpperCase())}
                            placeholder="Type a word..."
                            className={`w-full px-6 py-4 text-lg font-mono uppercase border-2 rounded-xl focus:outline-none transition-colors bg-white ${lastSubmitStatus === 'invalid' || lastSubmitStatus === 'duplicate'
                                ? 'border-red-300 focus:border-red-500'
                                : 'border-[#E6E4DD] focus:border-[#1A3C34]'
                                }`}
                            autoFocus
                        />
                        {lastSubmitStatus && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute right-4 top-1/2 -translate-y-1/2"
                            >
                                {lastSubmitStatus === 'valid' && <TbCheck className="w-6 h-6 text-green-500" />}
                                {(lastSubmitStatus === 'invalid' || lastSubmitStatus === 'duplicate') && <TbX className="w-6 h-6 text-red-500" />}
                            </motion.div>
                        )}
                    </motion.div>

                    {lastSubmitStatus === 'invalid' && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm text-red-600 px-2"
                        >
                            Not a valid word in this grid
                        </motion.div>
                    )}
                    {lastSubmitStatus === 'duplicate' && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm text-yellow-600 px-2"
                        >
                            Already found!
                        </motion.div>
                    )}
                </form>
            )}

            {/* Word Lists */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Found Words */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-[#E6E4DD]">
                    <h3 className="text-sm font-mono uppercase tracking-widest text-[#8A8A8A] mb-4 flex items-center gap-2">
                        <TbCheck className="w-4 h-4 text-green-500" />
                        Found ({foundWords.size})
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {foundWordsArray.map((word) => (
                            <motion.div
                                key={word}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm font-mono text-green-700"
                            >
                                {word}
                            </motion.div>
                        ))}
                        {foundWords.size === 0 && (
                            <div className="text-sm text-[#8A8A8A] italic">No words found yet</div>
                        )}
                    </div>
                </div>

                {/* Missing Words (shown when revealed) */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-[#E6E4DD]">
                    <h3 className="text-sm font-mono uppercase tracking-widest text-[#8A8A8A] mb-4 flex items-center gap-2">
                        <TbEye className="w-4 h-4 text-[#666]" />
                        {showAnswers ? `Missing (${missingWords.length})` : 'Remaining'}
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {showAnswers ? (
                            missingWords.map((word) => (
                                <motion.div
                                    key={word}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="px-3 py-2 bg-[#F9F7F1] border border-[#E6E4DD] rounded-lg text-sm font-mono text-[#1A1A1A]"
                                >
                                    {word}
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-sm text-[#8A8A8A] italic">
                                {missingWords.length} word{missingWords.length !== 1 ? 's' : ''} remaining
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
