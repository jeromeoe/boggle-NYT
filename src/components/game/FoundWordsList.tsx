
interface FoundWordsListProps {
    foundWords: string[];
    penalizedWords: string[];
}

export function FoundWordsList({ foundWords, penalizedWords }: FoundWordsListProps) {
    return (
        <div className="w-full max-w-sm mt-8 border-t border-[#E6E4DD] pt-4">
            <h3 className="text-xs font-bold text-[#1A3C34]/40 tracking-widest uppercase mb-3">
                History ({foundWords.length})
            </h3>

            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#E6E4DD]">
                {foundWords.length === 0 && penalizedWords.length === 0 ? (
                    <span className="text-sm text-[#8A8A8A] w-full text-center py-4 italic">
                        Found words will appear here...
                    </span>
                ) : (
                    <>
                        {[...foundWords].reverse().map((word, i) => (
                            <span
                                key={`found-${i}`}
                                className="px-2 py-1 bg-[#2D6A4F]/10 text-[#2D6A4F] text-xs font-mono rounded border border-[#2D6A4F]/20"
                            >
                                {word}
                            </span>
                        ))}
                        {[...penalizedWords].reverse().map((word, i) => (
                            <span
                                key={`pen-${i}`}
                                className="px-2 py-1 bg-[#9B2226]/10 text-[#9B2226] text-xs font-mono rounded border border-[#9B2226]/20 line-through decoration-[#9B2226]/50"
                            >
                                {word}
                            </span>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
