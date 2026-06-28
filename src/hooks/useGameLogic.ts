"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { generateBoard, generateOpenBoard, generateClosedBoard, parseCustomBoard } from "@/lib/boggle/dice";
import type { GameMode } from "@/components/game/GameModeModal";
import { findAllWords } from "@/lib/boggle/solver";
import { calculateTotalScore } from "@/lib/boggle/scoring";
import { useDictionary } from "@/hooks/useDictionary";

const GAME_DURATION = 180; // 3 minutes
const BLITZ_DURATION = 60;  // 1 minute
const ZEN_HINT_COOLDOWN_MS = 10000;

export function useGameLogic() {
    // Dictionary (shared cache via useDictionary)
    const { trie, validWords, dictionaryLoaded } = useDictionary();

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
    const [isDailyReplay, setIsDailyReplay] = useState(false);
    const [, setIsCustomBoardLoaded] = useState(false);
    const [isGeneratingBoard, setIsGeneratingBoard] = useState(false);
    const [isZenMode, setIsZenMode] = useState(false);
    const [hintCooldownMs, setHintCooldownMs] = useState(0);

    // Timer ref
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Refs that mirror state so endGame can always read fresh values
    // without being recreated on every state change
    const foundWordsRef = useRef<string[]>([]);
    const penalizedWordsRef = useRef<string[]>([]);
    const timeLeftRef = useRef(0);
    const allPossibleWordsRef = useRef<Set<string>>(new Set());
    const boardRef = useRef<string[][]>([]);
    const isDailyChallengeRef = useRef(false);
    const isDailyReplayRef = useRef(false);
    const hintReadyAtRef = useRef(0);

    useEffect(() => { foundWordsRef.current = foundWords; }, [foundWords]);
    useEffect(() => { penalizedWordsRef.current = penalizedWords; }, [penalizedWords]);
    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
    useEffect(() => { allPossibleWordsRef.current = allPossibleWords; }, [allPossibleWords]);
    useEffect(() => { boardRef.current = board; }, [board]);
    useEffect(() => { isDailyChallengeRef.current = isDailyChallenge; }, [isDailyChallenge]);
    useEffect(() => { isDailyReplayRef.current = isDailyReplay; }, [isDailyReplay]);

    useEffect(() => {
        if (!gameActive || !isZenMode) {
            hintReadyAtRef.current = 0;
            setHintCooldownMs(0);
            return;
        }

        const tick = () => {
            setHintCooldownMs(Math.max(0, hintReadyAtRef.current - Date.now()));
        };

        tick();
        const interval = setInterval(tick, 100);
        return () => clearInterval(interval);
    }, [gameActive, isZenMode]);

    // Set ready message once dictionary loads
    useEffect(() => {
        if (dictionaryLoaded) setStatusMessage("Ready to play!");
    }, [dictionaryLoaded]);

    // Check daily status on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            import('@/lib/supabase/auth')
                .then(({ getAuthenticatedUser }) => getAuthenticatedUser())
                .then((user) => {
                    if (!user) return;
                    import('@/lib/supabase/leaderboard').then(({ hasPlayedDailyToday }) => {
                        hasPlayedDailyToday(user.id).then(played => {
                            if (played) setIsDailyReplay(true);
                        });
                    });
                })
                .catch((e) => console.error(e));
        }
    }, []);

    const endGame = useCallback(async (manual: boolean) => {
        setGameActive(false);
        setGameWasManual(manual);
        setShowResults(true);

        // Read all values from refs to avoid stale closures —
        // refs are always current regardless of when this callback was created.
        if (isDailyChallengeRef.current && typeof window !== 'undefined') {
            try {
                const { getAuthenticatedUser } = await import('@/lib/supabase/auth');
                const user = await getAuthenticatedUser();
                if (!user) {
                    setStatusMessage("Sign in again to save your daily score.");
                    return;
                }

                if (!isDailyReplayRef.current) {
                    const { submitGameResult } = await import('@/lib/supabase/leaderboard');

                    const scores = calculateTotalScore(foundWordsRef.current, penalizedWordsRef.current);
                    const gameDuration = GAME_DURATION - timeLeftRef.current;

                    const result = await submitGameResult(user.id, {
                        grossScore: scores.gross,
                        penaltyScore: scores.penalty,
                        netScore: scores.net,
                        wordsFound: foundWordsRef.current,
                        wordsPenalized: penalizedWordsRef.current,
                        totalPossibleWords: allPossibleWordsRef.current.size,
                        durationSeconds: gameDuration,
                        boardState: boardRef.current,
                        isDailyChallenge: true
                    });

                    if (result.error) {
                        throw new Error(result.error);
                    }

                    // Submit daily stats (streak + medals) — gated server-side on email verification
                    const todayUTC = new Date().toISOString().slice(0, 10);
                    fetch('/api/stats/daily', {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            netScore: scores.net,
                            grossScore: scores.gross,
                            foundWords: foundWordsRef.current,
                            allPossibleWords: Array.from(allPossibleWordsRef.current),
                            challengeDate: todayUTC,
                        }),
                    }).catch(() => {}); // fire-and-forget

                    setIsDailyReplay(true);
                    console.log('Score submitted to leaderboard!');
                }
            } catch (error) {
                console.error('Failed to submit score:', error);
                setStatusMessage("Couldn't save your daily score. Please check your connection and sign in again.");
            }
        }
    }, []); // stable — reads live values via refs, never needs to be recreated

    // Timer countdown — placed after endGame so the dep below is in scope
    useEffect(() => {
        if (!gameActive || timeLeft <= 0 || isZenMode) return;

        timerRef.current = setTimeout(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [gameActive, timeLeft, isZenMode]);

    // End game when timer reaches 0 (not in zen mode)
    useEffect(() => {
        if (gameActive && timeLeft === 0 && !isZenMode) {
            endGame(false);
        }
    }, [gameActive, timeLeft, isZenMode, endGame]);

    const startGame = useCallback(async (mode: GameMode = "random") => {
        if (!trie) return;

        setIsGeneratingBoard(true);

        // Use setTimeout to let React flush the generating state before the sync loop blocks
        await new Promise<void>((resolve) => setTimeout(resolve, 0));

        let newBoard: string[][];
        if (mode === "open") newBoard = generateOpenBoard(trie);
        else if (mode === "closed") newBoard = generateClosedBoard(trie);
        else newBoard = generateBoard();

        const possible = findAllWords(newBoard, trie);

        setBoard(newBoard);
        setAllPossibleWords(possible);
        setFoundWords([]);
        setPenalizedWords([]);
        setTimeLeft(GAME_DURATION);
        setGameActive(true);
        setShowResults(false);
        setIsDailyChallenge(false);
        setIsCustomBoardLoaded(false);
        setIsZenMode(false);
        setStatusMessage(`${possible.size} words available`);
        setIsGeneratingBoard(false);
    }, [trie]);

    // Parses a 16-letter string, calculates all words, and starts the game in one batch.
    const startCustomGameFromInput = useCallback((input: string): boolean => {
        if (!trie) return false;
        const parsed = parseCustomBoard(input);
        if (!parsed) return false;

        const possible = findAllWords(parsed, trie);

        setBoard(parsed);
        setAllPossibleWords(possible);
        setFoundWords([]);
        setPenalizedWords([]);
        setTimeLeft(GAME_DURATION);
        setGameActive(true);
        setShowResults(false);
        setIsDailyChallenge(false);
        setIsCustomBoardLoaded(false);
        setIsZenMode(false);
        setStatusMessage(`Custom • ${possible.size} words available`);
        return true;
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
            if (!isZenMode) {
                setPenalizedWords((prev) => [...prev, normalizedWord]);
            }
            const reason = validWords.has(normalizedWord) ? "Not on board" : "Not in dictionary";
            return { status: "invalid", reason };
        }
    }, [gameActive, trie, foundWords, penalizedWords, allPossibleWords, validWords, isZenMode, endGame]);

    const scores = calculateTotalScore(foundWords, isZenMode ? [] : penalizedWords);

    const useZenHint = useCallback(() => {
        if (!gameActive || !isZenMode) return { status: "ignored" };

        const cooldownMs = Math.max(0, hintReadyAtRef.current - Date.now());
        if (cooldownMs > 0) {
            return { status: "cooldown", cooldownMs };
        }

        const found = new Set(foundWords);
        const candidates = Array.from(allPossibleWords)
            .filter((word) => !found.has(word))
            .sort((a, b) => a.length - b.length || a.localeCompare(b));

        if (candidates.length === 0) {
            setStatusMessage("No hints left - you found everything!");
            return { status: "empty" };
        }

        const word = candidates[Math.floor(Math.random() * Math.min(candidates.length, 20))];
        setStatusMessage(`Hint: try ${word}`);
        hintReadyAtRef.current = Date.now() + ZEN_HINT_COOLDOWN_MS;
        setHintCooldownMs(ZEN_HINT_COOLDOWN_MS);
        return { status: "hint", word };
    }, [allPossibleWords, foundWords, gameActive, isZenMode]);



    const startDailyChallenge = useCallback(async () => {
        if (!trie) return;

        setStatusMessage("Loading daily challenge...");
        setIsDailyChallenge(true);
        setIsDailyReplay(false); // Reset initially

        try {
            // Check if user has played today
            if (typeof window !== 'undefined') {
                try {
                    const { getAuthenticatedUser } = await import('@/lib/supabase/auth');
                    const user = await getAuthenticatedUser();
                    if (user) {
                        const { hasPlayedDailyToday } = await import('@/lib/supabase/leaderboard');
                        const alreadyPlayed = await hasPlayedDailyToday(user.id);
                        setIsDailyReplay(alreadyPlayed);
                        if (alreadyPlayed) {
                            console.log("Daily challenge already played today. Replay mode active (score will not be saved).");
                        }
                    } else {
                        setStatusMessage("Sign in to save your daily score.");
                        setIsDailyChallenge(false);
                        return;
                    }
                } catch (e) {
                    console.error("Error checking daily status:", e);
                }
            }

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
            setIsZenMode(false);
            setStatusMessage(`Daily Challenge • ${possible.size} words available`);
        } catch (error) {
            console.error("Failed to load daily challenge:", error);
            setStatusMessage("Error loading daily challenge");
            setIsDailyChallenge(false);
        }
    }, [trie]);

    const startBlitz = useCallback(async () => {
        if (!trie) return;
        setIsGeneratingBoard(true);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        const newBoard = generateBoard();
        const possible = findAllWords(newBoard, trie);
        setBoard(newBoard);
        setAllPossibleWords(possible);
        setFoundWords([]);
        setPenalizedWords([]);
        setTimeLeft(BLITZ_DURATION);
        setGameActive(true);
        setShowResults(false);
        setIsDailyChallenge(false);
        setIsCustomBoardLoaded(false);
        setIsZenMode(false);
        setStatusMessage(`Blitz · ${possible.size} words`);
        setIsGeneratingBoard(false);
    }, [trie]);

    const startRapid = useCallback(async () => {
        if (!trie) return;
        setIsGeneratingBoard(true);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        const newBoard = generateBoard();
        const possible = findAllWords(newBoard, trie);
        setBoard(newBoard);
        setAllPossibleWords(possible);
        setFoundWords([]);
        setPenalizedWords([]);
        setTimeLeft(GAME_DURATION);
        setGameActive(true);
        setShowResults(false);
        setIsDailyChallenge(false);
        setIsCustomBoardLoaded(false);
        setIsZenMode(false);
        setStatusMessage(`Rapid · ${possible.size} words`);
        setIsGeneratingBoard(false);
    }, [trie]);

    const startZen = useCallback(async () => {
        if (!trie) return;
        setIsGeneratingBoard(true);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        const newBoard = generateBoard();
        const possible = findAllWords(newBoard, trie);
        setBoard(newBoard);
        setAllPossibleWords(possible);
        setFoundWords([]);
        setPenalizedWords([]);
        setTimeLeft(0);
        setGameActive(true);
        setShowResults(false);
        setIsDailyChallenge(false);
        setIsCustomBoardLoaded(false);
        setIsZenMode(true);
        hintReadyAtRef.current = 0;
        setHintCooldownMs(0);
        setStatusMessage(`Zen · ${possible.size} words`);
        setIsGeneratingBoard(false);
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
        isDailyReplay,
        isGeneratingBoard,
        isZenMode,
        hintCooldownMs,

        // Actions
        startGame,
        startBlitz,
        startRapid,
        startZen,
        startCustomGameFromInput,
        startDailyChallenge,
        endGame,
        submitWord,
        useZenHint,
        setShowResults,
    };
}
