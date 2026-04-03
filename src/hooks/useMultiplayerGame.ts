"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { findAllWords } from "@/lib/boggle/solver";
import { calculateTotalScore } from "@/lib/boggle/scoring";
import type { Trie } from "@/lib/boggle/trie";
import type { SubmitPayload } from "@/lib/multiplayer/types";

interface Params {
    board: string[][];
    trie: Trie | null;
    isActive: boolean;
    roomId: string;
    onWordCountChange: (count: number) => void;
    onGameEnd: (result: SubmitPayload) => void;
}

export function useMultiplayerGame({ board, trie, isActive, roomId, onWordCountChange, onGameEnd }: Params) {
    const [foundWords, setFoundWords] = useState<string[]>([]);
    const [penalizedWords, setPenalizedWords] = useState<string[]>([]);
    const [allPossibleWords, setAllPossibleWords] = useState<Set<string>>(new Set());
    const [statusMessage, setStatusMessage] = useState('');

    // Refs so onGameEnd always reads the latest values
    const foundWordsRef = useRef<string[]>([]);
    const penalizedWordsRef = useRef<string[]>([]);

    useEffect(() => { foundWordsRef.current = foundWords; }, [foundWords]);
    useEffect(() => { penalizedWordsRef.current = penalizedWords; }, [penalizedWords]);

    // Compute possible words whenever the board changes
    useEffect(() => {
        if (!trie || board.length === 0) return;
        const possible = findAllWords(board, trie);
        setAllPossibleWords(possible);
        setStatusMessage(`${possible.size} words available`);
        setFoundWords([]);
        setPenalizedWords([]);
    }, [board, trie]);

    const scores = calculateTotalScore(foundWords, penalizedWords);

    const submitWord = useCallback((word: string): { status: string; reason?: string } => {
        if (!isActive || !trie) return { status: 'ignored' };

        const normalized = word.trim().toUpperCase();
        if (!normalized) return { status: 'empty' };
        if (normalized.length < 3) return { status: 'too_short' };

        if (foundWordsRef.current.includes(normalized) || penalizedWordsRef.current.includes(normalized)) {
            return { status: 'duplicate' };
        }

        if (allPossibleWords.has(normalized)) {
            const next = [...foundWordsRef.current, normalized];
            setFoundWords(next);
            onWordCountChange(next.length);
            return { status: 'valid' };
        } else {
            setPenalizedWords(prev => [...prev, normalized]);
            return { status: 'invalid', reason: 'Not on board' };
        }
    }, [isActive, trie, allPossibleWords, onWordCountChange]);

    // Called by useMultiplayerRoom when the timer hits zero
    const endGame = useCallback(() => {
        const scores = calculateTotalScore(foundWordsRef.current, penalizedWordsRef.current);
        onGameEnd({
            room_id: roomId,
            gross_score: scores.gross,
            penalty_score: scores.penalty,
            net_score: scores.net,
            words_found: foundWordsRef.current,
            words_penalized: penalizedWordsRef.current,
        });
    }, [roomId, onGameEnd]);

    return { foundWords, penalizedWords, allPossibleWords, scores, statusMessage, submitWord, endGame };
}
