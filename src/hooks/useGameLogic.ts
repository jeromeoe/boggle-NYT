"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { generateBoardWithSeed, parseCustomBoard } from "@/lib/boggle/dice";
import type { GameMode } from "@/components/game/GameModeModal";
import { findAllWords } from "@/lib/boggle/solver";
import { calculateTotalScore } from "@/lib/boggle/scoring";
import { findCandidateTrail } from "@/lib/boggle/pathFinder";
import { useDictionary } from "@/hooks/useDictionary";
import type { Trie } from "@/lib/boggle/trie";
import {
    createRandomBoardSeed,
    getChallengeModeLabel,
    type SeededChallenge,
} from "@/lib/boggle/share";

const GAME_DURATION = 180; // 3 minutes
const BLITZ_DURATION = 60;  // 1 minute
const ZEN_HINT_COOLDOWN_MS = 10000;
const SEED_STEP = 0x9E3779B9;

function solveSeededBoard(trie: Trie, seed: number) {
    const board = generateBoardWithSeed(seed);
    return { board, possible: findAllWords(board, trie) };
}

function createSeededRound(trie: Trie, mode: GameMode) {
    const initialSeed = createRandomBoardSeed();
    let fallback = { ...solveSeededBoard(trie, initialSeed), seed: initialSeed };

    for (let attempt = 0; attempt < 500; attempt++) {
        const seed = (initialSeed + Math.imul(attempt, SEED_STEP)) >>> 0;
        const candidate = { ...solveSeededBoard(trie, seed), seed };
        fallback = candidate;
        if (mode === 'random') return candidate;
        if (mode === 'open' && candidate.possible.size >= 180) return candidate;
        if (mode === 'closed' && candidate.possible.size < 50) return candidate;
    }

    return fallback;
}

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
    const [gameWasCompleted, setGameWasCompleted] = useState(false);
    const [isDailyChallenge, setIsDailyChallenge] = useState(false);
    const [isDailyReplay, setIsDailyReplay] = useState(false);
    const [, setIsCustomBoardLoaded] = useState(false);
    const [isGeneratingBoard, setIsGeneratingBoard] = useState(false);
    const [isZenMode, setIsZenMode] = useState(false);
    const [hintCooldownMs, setHintCooldownMs] = useState(0);
    const [zenHintCell, setZenHintCell] = useState<string | null>(null);
    const [currentChallenge, setCurrentChallenge] = useState<SeededChallenge | null>(null);
    const [isSharedChallenge, setIsSharedChallenge] = useState(false);

    // Timer ref
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Refs that mirror state so endGame can always read fresh values
    // without being recreated on every state change
    const foundWordsRef = useRef<string[]>([]);
    const penalizedWordsRef = useRef<string[]>([]);
    const timeLeftRef = useRef(0);
    const isDailyChallengeRef = useRef(false);
    const isDailyReplayRef = useRef(false);
    const dailyChallengeDateRef = useRef<string | null>(null);
    const hintReadyAtRef = useRef(0);
    const zenHintCellsRef = useRef<Set<string>>(new Set());

    useEffect(() => { foundWordsRef.current = foundWords; }, [foundWords]);
    useEffect(() => { penalizedWordsRef.current = penalizedWords; }, [penalizedWords]);
    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
    useEffect(() => { isDailyChallengeRef.current = isDailyChallenge; }, [isDailyChallenge]);
    useEffect(() => { isDailyReplayRef.current = isDailyReplay; }, [isDailyReplay]);

    useEffect(() => {
        if (!gameActive || !isZenMode) {
            hintReadyAtRef.current = 0;
            zenHintCellsRef.current.clear();
            setHintCooldownMs(0);
            setZenHintCell(null);
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

    const endGame = useCallback(async (manual: boolean, completed = false) => {
        setGameActive(false);
        setGameWasManual(manual);
        setGameWasCompleted(completed);
        setShowResults(true);

        // Read all values from refs to avoid stale closures —
        // refs are always current regardless of when this callback was created.
        if (isDailyChallengeRef.current && typeof window !== 'undefined') {
            try {
                const { getAuthenticatedUser } = await import('@/lib/supabase/auth');
                const user = await getAuthenticatedUser();
                if (!user) {
                    setStatusMessage("Daily complete. Create an account next time to save your score and appear on the leaderboard.");
                    return;
                }

                if (!isDailyReplayRef.current) {
                    const { submitGameResult } = await import('@/lib/supabase/leaderboard');

                    const gameDuration = GAME_DURATION - timeLeftRef.current;
                    const challengeDate = dailyChallengeDateRef.current;
                    if (!challengeDate) throw new Error('Daily challenge date is missing.');

                    const result = await submitGameResult({
                        challengeDate,
                        wordsFound: foundWordsRef.current,
                        wordsPenalized: penalizedWordsRef.current,
                        durationSeconds: gameDuration,
                        isDailyChallenge: true
                    });

                    if (result.error || !result.data) {
                        throw new Error(result.error ?? 'Daily score submission failed.');
                    }

                    // Submit daily stats (streak + medals) — gated server-side on email verification
                    const statsResponse = await fetch('/api/stats/daily', {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ gameId: result.data.id }),
                    });
                    if (!statsResponse.ok && statsResponse.status !== 403) {
                        console.error('Daily stats update failed:', await statsResponse.text());
                    }

                    setIsDailyReplay(true);
                    setStatusMessage('Daily score verified and saved.');
                }
            } catch (error) {
                console.error('Failed to submit score:', error);
                setStatusMessage("Couldn't save your daily score. Please check your connection and sign in again.");
            }
        }
    }, []); // stable — reads live values via refs, never needs to be recreated

    // Count down in timed modes and up in Zen so it doubles as a stopwatch.
    useEffect(() => {
        if (!gameActive || (!isZenMode && timeLeft <= 0)) return;

        timerRef.current = setTimeout(() => {
            setTimeLeft((prev) => isZenMode ? prev + 1 : prev - 1);
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

    // Complete the board through the normal end-game path so results and
    // Daily submissions stay consistent.
    useEffect(() => {
        if (
            gameActive &&
            allPossibleWords.size > 0 &&
            foundWords.length === allPossibleWords.size
        ) {
            setStatusMessage("Board complete!");
            endGame(false, true);
        }
    }, [gameActive, allPossibleWords.size, foundWords.length, endGame]);

    const startGame = useCallback(async (mode: GameMode = "random") => {
        if (!trie) return;

        setIsGeneratingBoard(true);

        // Use setTimeout to let React flush the generating state before the sync loop blocks
        await new Promise<void>((resolve) => setTimeout(resolve, 0));

        const { board: newBoard, possible, seed } = createSeededRound(trie, mode);

        setBoard(newBoard);
        setCurrentChallenge({ seed, mode });
        setIsSharedChallenge(false);
        setAllPossibleWords(possible);
        setFoundWords([]);
        setPenalizedWords([]);
        setTimeLeft(GAME_DURATION);
        setGameActive(true);
        setShowResults(false);
        setIsDailyChallenge(false);
        setIsCustomBoardLoaded(false);
        setIsZenMode(false);
        zenHintCellsRef.current.clear();
        hintReadyAtRef.current = 0;
        setHintCooldownMs(0);
        setZenHintCell(null);
        setStatusMessage(`${possible.size} words available`);
        setIsGeneratingBoard(false);
    }, [trie]);

    const startSeededChallenge = useCallback(async (challenge: SeededChallenge) => {
        if (!trie) return;
        setIsGeneratingBoard(true);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));

        const { board: newBoard, possible } = solveSeededBoard(trie, challenge.seed);
        const duration = challenge.mode === 'blitz' ? BLITZ_DURATION : challenge.mode === 'zen' ? 0 : GAME_DURATION;
        const label = getChallengeModeLabel(challenge.mode);

        setBoard(newBoard);
        setCurrentChallenge(challenge);
        setIsSharedChallenge(true);
        setAllPossibleWords(possible);
        setFoundWords([]);
        setPenalizedWords([]);
        setTimeLeft(duration);
        setGameActive(true);
        setShowResults(false);
        setIsDailyChallenge(false);
        setIsCustomBoardLoaded(false);
        setIsZenMode(challenge.mode === 'zen');
        zenHintCellsRef.current.clear();
        setZenHintCell(null);
        hintReadyAtRef.current = 0;
        setHintCooldownMs(0);
        setStatusMessage(`Shared ${label} · ${possible.size} words available`);
        setIsGeneratingBoard(false);
    }, [trie]);

    // Parses a 16-letter string, calculates all words, and starts the game in one batch.
    const startCustomGameFromInput = useCallback((input: string): boolean => {
        if (!trie) return false;
        const parsed = parseCustomBoard(input);
        if (!parsed) return false;

        const possible = findAllWords(parsed, trie);

        setBoard(parsed);
        setCurrentChallenge(null);
        setIsSharedChallenge(false);
        setAllPossibleWords(possible);
        setFoundWords([]);
        setPenalizedWords([]);
        setTimeLeft(GAME_DURATION);
        setGameActive(true);
        setShowResults(false);
        setIsDailyChallenge(false);
        setIsCustomBoardLoaded(false);
        setIsZenMode(false);
        zenHintCellsRef.current.clear();
        hintReadyAtRef.current = 0;
        setHintCooldownMs(0);
        setZenHintCell(null);
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
            setZenHintCell(null);
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

        const hint = candidates
            .map((word) => {
                const trail = findCandidateTrail(word, board);
                const nextCell = Array.from(trail.activeCells)
                    .find((cell) => !zenHintCellsRef.current.has(cell));

                return { trail, nextCell };
            })
            .find(({ nextCell }) => nextCell !== undefined);

        if (!hint || !hint.nextCell) {
            setStatusMessage("No hint is available for this board.");
            return { status: "empty" };
        }

        // Sets preserve the pathfinder's traversal order. Remember every cell
        // used by a hint so each ready cycle advances to a new tile.
        const cell = hint.nextCell;
        zenHintCellsRef.current.add(cell);
        setZenHintCell(cell);
        setStatusMessage("Hint: the next tile in a shortest unfound word is highlighted.");
        hintReadyAtRef.current = Date.now() + ZEN_HINT_COOLDOWN_MS;
        setHintCooldownMs(ZEN_HINT_COOLDOWN_MS);
        return { status: "hint", cell };
    }, [allPossibleWords, board, foundWords, gameActive, isZenMode]);



    const startDailyChallenge = useCallback(async () => {
        if (!trie) return false;

        setIsGeneratingBoard(true);
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
            setCurrentChallenge(null);
            setIsSharedChallenge(false);
            dailyChallengeDateRef.current = dailyResult.date;
            setAllPossibleWords(possible);
            setFoundWords([]);
            setPenalizedWords([]);
            setTimeLeft(GAME_DURATION);
            setGameActive(true);
            setShowResults(false);
            setIsZenMode(false);
            zenHintCellsRef.current.clear();
            hintReadyAtRef.current = 0;
            setHintCooldownMs(0);
            setZenHintCell(null);
            setStatusMessage(`Daily Challenge • ${possible.size} words available`);
            setIsGeneratingBoard(false);
            return true;
        } catch (error) {
            console.error("Failed to load daily challenge:", error);
            setStatusMessage("Error loading daily challenge");
            setIsDailyChallenge(false);
            setIsGeneratingBoard(false);
            return false;
        }
    }, [trie]);

    const startBlitz = useCallback(async () => {
        if (!trie) return;
        setIsGeneratingBoard(true);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        const seed = createRandomBoardSeed();
        const { board: newBoard, possible } = solveSeededBoard(trie, seed);
        setBoard(newBoard);
        setCurrentChallenge({ seed, mode: 'blitz' });
        setIsSharedChallenge(false);
        setAllPossibleWords(possible);
        setFoundWords([]);
        setPenalizedWords([]);
        setTimeLeft(BLITZ_DURATION);
        setGameActive(true);
        setShowResults(false);
        setIsDailyChallenge(false);
        setIsCustomBoardLoaded(false);
        setIsZenMode(false);
        zenHintCellsRef.current.clear();
        hintReadyAtRef.current = 0;
        setHintCooldownMs(0);
        setZenHintCell(null);
        setStatusMessage(`Blitz · ${possible.size} words`);
        setIsGeneratingBoard(false);
    }, [trie]);

    const startRapid = useCallback(async () => {
        if (!trie) return;
        setIsGeneratingBoard(true);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        const seed = createRandomBoardSeed();
        const { board: newBoard, possible } = solveSeededBoard(trie, seed);
        setBoard(newBoard);
        setCurrentChallenge({ seed, mode: 'rapid' });
        setIsSharedChallenge(false);
        setAllPossibleWords(possible);
        setFoundWords([]);
        setPenalizedWords([]);
        setTimeLeft(GAME_DURATION);
        setGameActive(true);
        setShowResults(false);
        setIsDailyChallenge(false);
        setIsCustomBoardLoaded(false);
        setIsZenMode(false);
        zenHintCellsRef.current.clear();
        hintReadyAtRef.current = 0;
        setHintCooldownMs(0);
        setZenHintCell(null);
        setStatusMessage(`Rapid · ${possible.size} words`);
        setIsGeneratingBoard(false);
    }, [trie]);

    const startZen = useCallback(async () => {
        if (!trie) return;
        setIsGeneratingBoard(true);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        const seed = createRandomBoardSeed();
        const { board: newBoard, possible } = solveSeededBoard(trie, seed);
        setBoard(newBoard);
        setCurrentChallenge({ seed, mode: 'zen' });
        setIsSharedChallenge(false);
        setAllPossibleWords(possible);
        setFoundWords([]);
        setPenalizedWords([]);
        setTimeLeft(0);
        setGameActive(true);
        setShowResults(false);
        setIsDailyChallenge(false);
        setIsCustomBoardLoaded(false);
        setIsZenMode(true);
        zenHintCellsRef.current.clear();
        setZenHintCell(null);
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
        gameWasCompleted,
        allPossibleWords,
        isDailyChallenge,
        isDailyReplay,
        isGeneratingBoard,
        isZenMode,
        hintCooldownMs,
        zenHintCell,
        currentChallenge,
        isSharedChallenge,

        // Actions
        startGame,
        startSeededChallenge,
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
