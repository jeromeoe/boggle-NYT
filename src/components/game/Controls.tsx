
interface ControlsProps {
    gameActive: boolean;
    onStart: () => void;
    onEnd: () => void;
    onCustomBoard: () => void;
    isLoading?: boolean;
}

export function GameControls({ gameActive, onStart, onEnd, onCustomBoard, isLoading }: ControlsProps) {
    return (
        <div className="flex flex-col gap-3 w-full max-w-sm">
            <button
                onClick={gameActive ? onEnd : onStart}
                disabled={isLoading}
                className={`
          w-full py-4 rounded-lg font-serif text-lg font-semibold tracking-wide 
          transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
          ${gameActive
                        ? 'bg-[#E63946] text-white hover:bg-[#D62839] border border-[#BC202E]'
                        : 'bg-[#1A3C34] text-[#F9F7F1] hover:bg-[#142E28] border border-[#0F221E]'
                    }
        `}
            >
                {isLoading ? "Loading..." : gameActive ? 'Stop Game' : 'Start New Game'}
            </button>

            {!gameActive && (
                <button
                    onClick={onCustomBoard}
                    className="text-xs text-[#666666] hover:text-[#1A3C34] hover:underline underline-offset-4 transition-colors text-center mt-2"
                >
                    Enter Custom Board Layout...
                </button>
            )}
        </div>
    );
}
