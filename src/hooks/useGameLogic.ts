"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { generateBoard, parseCustomBoard } from "@/lib/boggle/dice";
import { loadDictionary } from "@/lib/boggle/trie";
import { findAllWords } from "@/lib/boggle/solver";
import { calculateTotalScore } from "@/lib/boggle/scoring";
import type { Trie } from "@/lib/boggle/trie";

const GAME_DURATION = 180; // 3 minutes

export function useGameLogic() {
    // Dictionary state
    const [dictionaryLoaded, setDictionaryLoaded] = useState(false);
    const [trie, setTrie] = useState<Trie | null>(null);
    const [validWords, setValidWords] = useState<Set<string>>(new Set());

    // Game state
    const [board, setBoard] = useState<string[][]>([]);
    const [allPossibleWords, setAllPossibleWords] = useState<Set<string>>(new Set());
    const [foundWords, setFoundWords] = useState<string[]>([]);
    const [penalizedWords, setPenalizedWords] = useState<string[]>([]);
    const [gameActive, setGameActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [statusMessage, setStatusMessage] = useState("Loading dictionary...");
    const [showResults, setShowResults] = useState(false);
    const [gameWasManual, setGameWasManual] = useState(false);
    const [isDailyChallenge, setIsDailyChallenge] = useState(false);

    // Timer ref
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Load dictionary on mount
    useEffect(() => {
        loadDictionary().then(({ words, trie: loadedTrie }) => {
            setValidWords(words);
            setTrie(loadedTrie);
            setDictionaryLoaded(true);
            setStatusMessage("Ready to play!");
        });
    }, []);

    // Timer countdown
    useEffect(() => {
        if (!gameActive || timeLeft <= 0) return;

        timerRef.current = setTimeout(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [gameActive, timeLeft]);

    // End game when timer reaches 0
    useEffect(() => {
        if (gameActive && timeLeft === 0) {
            endGame(false);
        }
    }, [gameActive, timeLeft]);

    const endGame = useCallback(async (manual: boolean) => {
        setGameActive(false);
        setGameWasManual(manual);
        setShowResults(true);

        // Submit score if it's a daily challenge and user is logged in
        if (isDailyChallenge && typeof window !== 'undefined') {
            const userStr = localStorage.getItem('boggle_user');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    const { submitGameResult } = await import('@/lib/supabase/leaderboard');

                    const scores = calculateTotalScore(foundWords, penalizedWords);
                    const gameDuration = GAME_DURATION - timeLeft;

                    await submitGameResult(user.id, {
                        grossScore: scores.gross,
                        penaltyScore: scores.penalty,
                        netScore: scores.net,
                        wordsFound: foundWords,
                        wordsPenalized: penalizedWords,
                        totalPossibleWords: allPossibleWords.size,
                        durationSeconds: gameDuration,
                        boardState: board,
                        isDailyChallenge: true
                    });

                    console.log('Score submitted to leaderboard!');
                } catch (error) {
                    console.error('Failed to submit score:', error);
                }
            }
        }
    }, [isDailyChallenge, foundWords, penalizedWords, timeLeft, allPossibleWords, board]);

    const startGame = useCallback(() => {
        if (!trie) return;

        // Generate board
        const newBoard = generateBoard();
        const possible = findAllWords(newBoard, trie);

        setBoard(newBoard);
        setAllPossibleWords(possible);
        setFoundWords([]);
        setPenalizedWords([]);
        setTimeLeft(GAME_DURATION);
        setGameActive(true);
        setShowResults(false);
        setStatusMessage(`${possible.size} words available`);
    }, [trie]);

    const loadCustomBoard = useCallback((input: string) => {
        const parsed = parseCustomBoard(input);
        if (!parsed) return false;

        if (trie) {
            setBoard(parsed);
            const possible = findAllWords(parsed, trie);
            setAllPossibleWords(possible);
            setFoundWords([]);
            setPenalizedWords([]);
            setTimeLeft(GAME_DURATION);
            setGameActive(false);
            setStatusMessage("Custom board loaded. Press START to play.");
            return true;
        }
        return false;
    }, [trie]);

    const submitWord = useCallback((word: string) => {
        if (!gameActive || !trie) return { status: "ignored" };

        const normalizedWord = word.trim().toUpperCase();

        if (!normalizedWord) return { status: "empty" };
        if (normalizedWord === "-1") {
            endGame(true);
            return { status: "quit" };
        }
        if (normalizedWord.length < 3) return { status: "too_short" };

        if (foundWords.includes(normalizedWord) || penalizedWords.includes(normalizedWord)) {
            return { status: "duplicate" };
        }

        if (allPossibleWords.has(normalizedWord)) {
            setFoundWords((prev) => [...prev, normalizedWord]);
            return { status: "valid" };
        } else {
            setPenalizedWords((prev) => [...prev, normalizedWord]);
            const reason = validWords.has(normalizedWord) ? "Not on board" : "Not in dictionary";
            return { status: "invalid", reason };
        }
    }, [gameActive, trie, foundWords, penalizedWords, allPossibleWords, validWords, endGame]);

    const scores = calculateTotalScore(foundWords, penalizedWords);

    const startDailyChallenge = useCallback(async () => {
        if (!trie) return;

        setStatusMessage("Loading daily challenge...");
        setIsDailyChallenge(true);

        try {
            // Import daily module
            const { getTodaysDailyBoard } = await import("@/lib/boggle/daily");
            const dailyResult = await getTodaysDailyBoard();

            const newBoard = dailyResult.board;
            const possible = findAllWords(newBoard, trie);

            setBoard(newBoard);
            setAllPossibleWords(possible);
            setFoundWords([]);
            setPenalizedWords([]);
            setTimeLeft(GAME_DURATION);
            setGameActive(true);
            setShowResults(false);
            setStatusMessage(`Daily Boggle • ${possible.size} words available`);
        } catch (error) {
            console.error("Failed to load daily challenge:", error);
            setStatusMessage("Error loading daily challenge");
            setIsDailyChallenge(false);
        }
    }, [trie]);

    return {
        // State
        dictionaryLoaded,
        board,
        gameActive,
        timeLeft,
        foundWords,
        penalizedWords,
        scores,
        statusMessage,
        showResults,
        gameWasManual,
        allPossibleWords,
        isDailyChallenge,

        // Actions
        startGame,
        startDailyChallenge,
        endGame,
        submitWord,
        setShowResults,
        loadCustomBoard
    };
}
