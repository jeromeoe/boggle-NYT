import { Tile } from "./Tile";

interface BoardProps {
    board: string[][];
    onTileClick: (letter: string) => void;
    disabled?: boolean;
}

export function Board({ board, onTileClick, disabled }: BoardProps) {
    return (
        <div className="bg-white/40 border border-[#E6E4DD] rounded-xl p-4 md:p-6 shadow-sm backdrop-blur-sm">
            <div className="grid grid-cols-4 gap-3 md:gap-4">
                {board.length > 0 ? (
                    board.map((row, r) =>
                        row.map((letter, c) => (
                            <Tile
                                key={`${r}-${c}`}
                                letter={letter}
                                onClick={() => onTileClick(letter)}
                                disabled={disabled}
                            />
                        ))
                    )
                ) : (
                    Array.from({ length: 16 }).map((_, i) => (
                        <div
                            key={i}
                            className="w-14 h-14 md:w-16 md:h-16 bg-[#F0EEE6] border border-[#E6E4DD] rounded-lg flex items-center justify-center text-[#8A8A8A]/30 text-xl font-serif"
                        >
                            ?
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
