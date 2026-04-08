"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tile } from "./Tile";
import type { CandidateTrail } from "@/lib/boggle/pathFinder";

interface BoardProps {
    board: string[][];
    onTileClick: (letter: string) => void;
    disabled?: boolean;
    candidateTrail?: CandidateTrail;
}

interface TilePos { x: number; y: number; }

export function Board({ board, onTileClick, disabled, candidateTrail }: BoardProps) {
    const gridRef = useRef<HTMLDivElement>(null);
    const [tilePositions, setTilePositions] = useState<Record<string, TilePos>>({});

    useEffect(() => {
        const measure = () => {
            if (!gridRef.current) return;
            const gridRect = gridRef.current.getBoundingClientRect();
            const tiles = gridRef.current.querySelectorAll<HTMLElement>("[data-tile-key]");
            const positions: Record<string, TilePos> = {};
            tiles.forEach((el) => {
                const key = el.getAttribute("data-tile-key")!;
                const rect = el.getBoundingClientRect();
                positions[key] = {
                    x: rect.left - gridRect.left + rect.width / 2,
                    y: rect.top - gridRect.top + rect.height / 2,
                };
            });
            setTilePositions(positions);
        };

        measure();
        const observer = new ResizeObserver(measure);
        if (gridRef.current) observer.observe(gridRef.current);
        return () => observer.disconnect();
    }, [board]);

    const activeCells = candidateTrail?.activeCells ?? new Set<string>();
    const activeEdges = candidateTrail?.activeEdges ?? new Set<string>();

    // Parse "r1,c1-r2,c2" edges into line coords
    const lines: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];
    activeEdges.forEach((edge) => {
        // edge is "r1,c1-r2,c2" — find the dash that separates the two pairs
        const dashIdx = edge.indexOf("-", edge.indexOf(",") + 1);
        const fromKey = edge.slice(0, dashIdx);
        const toKey = edge.slice(dashIdx + 1);
        const p1 = tilePositions[fromKey];
        const p2 = tilePositions[toKey];
        if (p1 && p2) lines.push({ key: edge, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
    });

    return (
        <div className="bg-white/40 border border-[#E6E4DD] rounded-xl p-4 md:p-6 shadow-sm backdrop-blur-sm">
            <div ref={gridRef} className="relative grid grid-cols-4 gap-3 md:gap-4">
                {/* Connector lines — behind tiles */}
                <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ overflow: "visible", zIndex: 0 }}
                >
                    <AnimatePresence>
                        {lines.map((line) => (
                            <motion.line
                                key={line.key}
                                x1={line.x1} y1={line.y1}
                                x2={line.x2} y2={line.y2}
                                stroke="#1A3C34"
                                strokeWidth="4"
                                strokeLinecap="round"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.55 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.12 }}
                            />
                        ))}
                    </AnimatePresence>
                </svg>

                {board.length > 0 ? (
                    board.map((row, r) =>
                        row.map((letter, c) => {
                            const key = `${r},${c}`;
                            return (
                                <div
                                    key={key}
                                    data-tile-key={key}
                                    className="w-14 h-14 md:w-16 md:h-16"
                                    style={{ position: "relative", zIndex: 1 }}
                                >
                                    <Tile
                                        letter={letter}
                                        onClick={() => onTileClick(letter)}
                                        disabled={disabled}
                                        isActive={activeCells.has(key)}
                                    />
                                </div>
                            );
                        })
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
