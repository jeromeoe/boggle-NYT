
import { TbShare3 } from "react-icons/tb";

interface ControlsProps {
    gameActive: boolean;
    onStart: () => void;
    onEnd: () => void;
    isLoading?: boolean;
    onShare?: () => void;
    shareStatus?: string;
}

export function GameControls({ gameActive, onStart, onEnd, isLoading, onShare, shareStatus }: ControlsProps) {
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
                {isLoading ? "Generating..." : gameActive ? 'Stop Game' : 'Start New Game'}
            </button>
            {onShare && (
                <button
                    type="button"
                    onClick={onShare}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#1A3C34]/25 bg-white py-3 text-sm font-semibold text-[#1A3C34] shadow-sm transition-colors hover:bg-[#F0EEE6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3C34] focus-visible:ring-offset-2"
                >
                    <TbShare3 className="h-4 w-4" aria-hidden="true" />
                    {shareStatus || 'Share this board'}
                </button>
            )}
        </div>
    );
}
