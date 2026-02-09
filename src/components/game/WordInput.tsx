import { useRef, useEffect } from "react";

interface WordInputProps {
    currInput: string;
    setCurrInput: (val: string) => void;
    onSubmit: () => void;
    gameActive: boolean;
    statusMessage: string;
}

export function WordInput({ currInput, setCurrInput, onSubmit, gameActive, statusMessage }: WordInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (gameActive) {
            inputRef.current?.focus();
        }
    }, [gameActive, currInput]); // Keep focus when typing

    return (
        <div className="w-full max-w-sm space-y-2">
            <div className="relative group">
                <input
                    ref={inputRef}
                    type="text"
                    value={currInput}
                    onChange={(e) => setCurrInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
                    placeholder={gameActive ? "TYPE WORDS HERE..." : "Waiting to start..."}
                    disabled={!gameActive}
                    className={`
            w-full bg-[#F9F7F1] border-2 
            ${gameActive ? 'border-[#1A3C34] focus:ring-4 focus:ring-[#1A3C34]/10' : 'border-[#E6E4DD]'}
            text-[#1A1A1A] px-4 py-4 rounded-lg font-mono text-lg uppercase tracking-widest
            focus:outline-none transition-all placeholder:text-[#8A8A8A]/50
            disabled:bg-[#F0EEE6] disabled:cursor-not-allowed
          `}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="text-xs text-[#1A3C34]/40 font-mono">ENTER ↵</span>
                </div>
            </div>

            <div className="h-6 text-center text-sm font-medium text-[#666666] min-h-[1.5rem]">
                {statusMessage}
            </div>
        </div>
    );
}
