"use client";

import { analyzeCoreChains, analyzeAnagrams, getWordsByLength } from "@/lib/boggle/analytics";
import { motion, AnimatePresence } from "framer-motion";

interface ResultsReportProps {
    isOpen: boolean;
    onClose: () => void;
    allPossibleWords: Set<string>;
    foundWords: Set<string>;
    gross: number;
    penalty: number;
    net: number;
    wasManual: boolean;
}

export function ResultsReport({
    isOpen,
    onClose,
    allPossibleWords,
    foundWords,
    gross,
    penalty,
    net,
    wasManual
}: ResultsReportProps) {
    if (!isOpen) return null;

    const coreChains = analyzeCoreChains(allPossibleWords, foundWords);
    const anagramSets = analyzeAnagrams(allPossibleWords);
    const allWordsSorted = getWordsByLength(allPossibleWords);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#1A3C34]/40 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative bg-[#F9F7F1] w-full max-w-4xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col border border-[#E6E4DD] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-white p-8 text-center relative border-b-2 border-[#1A3C34]">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#1A3C34] via-[#D4AF37] to-[#1A3C34]" />
                            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-2 tracking-tight text-[#1A3C34] mt-2">
                                {wasManual ? "Session Ended" : "Time's Up"}
                            </h2>
                            <div className="text-[#666666] font-mono text-sm uppercase tracking-widest mb-8">
                                Performance Report
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
                                <div className="bg-gradient-to-br from-[#1A3C34] to-[#0F2016] rounded-xl p-6 shadow-lg">
                                    <div className="text-5xl font-bold font-serif text-white">{net}</div>
                                    <div className="text-xs uppercase tracking-widest text-[#8A9A90] mt-2">Net Score</div>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 shadow-md border-2 border-green-200">
                                    <div className="text-4xl font-mono font-bold text-green-700">+{gross}</div>
                                    <div className="text-xs uppercase tracking-widest text-green-600 mt-2">Earned</div>
                                </div>
                                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 shadow-md border-2 border-red-200">
                                    <div className="text-4xl font-mono font-bold text-red-700">-{Math.abs(penalty)}</div>
                                    <div className="text-xs uppercase tracking-widest text-red-600 mt-2">Penalty</div>
                                </div>
                                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 shadow-md border-2 border-amber-200">
                                    <div className="text-4xl font-mono font-bold text-amber-700">{(() => {
                                        // Calculate max possible score
                                        let maxScore = 0;
                                        allPossibleWords.forEach(word => {
                                            const length = word.length;
                                            if (length <= 4) maxScore += 1;
                                            else if (length === 5) maxScore += 2;
                                            else if (length === 6) maxScore += 3;
                                            else if (length === 7) maxScore += 5;
                                            else if (length === 8) maxScore += 7;
                                            else maxScore += 11;
                                        });
                                        return maxScore;
                                    })()}</div>
                                    <div className="text-xs uppercase tracking-widest text-amber-600 mt-2">Max Points</div>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable content */}
                        <div className="overflow-y-auto p-6 md:p-8 space-y-10 custom-scrollbar">

                            {/* Core Chains */}
                            <section>
                                <h3 className="text-xl font-bold font-serif text-[#1A3C34] mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-[#D4AF37] rounded-full" />
                                    Longest Chains
                                </h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    {coreChains.slice(0, 4).map((chain, i) => (
                                        <div key={i} className="bg-white border border-[#E6E4DD] rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="font-bold text-lg mb-2 text-[#1A3C34] border-b border-[#E6E4DD] pb-2">
                                                {chain.core} <span className="text-sm font-normal text-[#8A8A8A]">({chain.words.length})</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {chain.words.map((word, j) => (
                                                    <span
                                                        key={j}
                                                        className={`text-xs px-1.5 py-0.5 rounded ${foundWords.has(word)
                                                            ? "bg-[#2D6A4F]/10 text-[#2D6A4F] font-bold"
                                                            : "text-[#8A8A8A]"
                                                            }`}
                                                    >
                                                        {word}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Anagrams */}
                            <section>
                                <h3 className="text-xl font-bold font-serif text-[#1A3C34] mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-[#D4AF37] rounded-full" />
                                    Top Anagram Sets
                                </h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    {anagramSets.slice(0, 4).map((set, i) => (
                                        <div key={i} className="bg-white border border-[#E6E4DD] rounded-lg p-4 shadow-sm">
                                            <div className="text-sm text-[#8A8A8A] mb-2 font-mono">
                                                {set.words[0].length} Letters ({set.words.length} words)
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {set.words.map((word, j) => (
                                                    <span
                                                        key={j}
                                                        className={`text-xs px-1.5 py-0.5 rounded ${foundWords.has(word)
                                                            ? "bg-[#2D6A4F]/10 text-[#2D6A4F] font-bold"
                                                            : "text-[#8A8A8A]"
                                                            }`}
                                                    >
                                                        {word}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* All Words */}
                            <section>
                                <h3 className="text-xl font-bold font-serif text-[#1A3C34] mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-[#D4AF37] rounded-full" />
                                    All Solutions
                                </h3>
                                <div className="columns-2 md:columns-4 gap-4 space-y-1">
                                    {allWordsSorted.map((word, i) => (
                                        <div
                                            key={i}
                                            className={`font-mono text-xs break-inside-avoid ${foundWords.has(word) ? "text-[#2D6A4F] font-bold" : "text-[#8A8A8A]/60"
                                                }`}
                                        >
                                            {word}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-[#E6E4DD] bg-[#F9F7F1]">
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-[#1A3C34] hover:bg-[#142E28] text-[#F9F7F1] font-semibold rounded-lg transition-all shadow-md active:scale-[0.99]"
                            >
                                Close Report
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
