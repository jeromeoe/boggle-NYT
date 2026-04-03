"use client";

import { useState, useEffect, useCallback } from "react";
import { useMultiplayerRoom } from "@/hooks/useMultiplayerRoom";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { useDictionary } from "@/hooks/useDictionary";
import { generateBoardWithSeed } from "@/lib/boggle/dice";
import { MultiplayerEntryModal } from "./MultiplayerEntryModal";
import { MultiplayerLobby } from "./MultiplayerLobby";
import { MultiplayerOpponentTracker } from "./MultiplayerOpponentTracker";
import { MultiplayerResultsScreen } from "./MultiplayerResultsScreen";
import { Board } from "@/components/game/Board";
import { WordInput } from "@/components/game/WordInput";
import { Timer } from "@/components/game/Timer";
import { FoundWordsList } from "@/components/game/FoundWordsList";
import type { User } from "@/lib/supabase/client";
import type { SubmitPayload } from "@/lib/multiplayer/types";
import { motion } from "framer-motion";

interface Props {
    user: User;
    onExit: () => void;
}

export function MultiplayerView({ user, onExit }: Props) {
    const { trie, dictionaryLoaded } = useDictionary();
    const [currInput, setCurrInput] = useState("");
    const [board, setBoard] = useState<string[][]>([]);

    const {
        room,
        players,
        phase,
        wordCounts,
        timeLeft,
        error,
        isLoading,
        createRoom,
        joinRoom,
        startGame,
        submitResult,
        broadcastWordCount,
        leaveRoom,
        setOnTimerExpired,
    } = useMultiplayerRoom(user.id);

    const handleGameEnd = useCallback(async (result: SubmitPayload) => {
        await submitResult(result);
    }, [submitResult]);

    const {
        foundWords,
        penalizedWords,
        scores,
        statusMessage,
        submitWord,
        endGame: endMultiplayerGame,
    } = useMultiplayerGame({
        board,
        trie,
        isActive: phase === 'playing',
        roomId: room?.id ?? '',
        onWordCountChange: broadcastWordCount,
        onGameEnd: handleGameEnd,
    });

    // When the room status becomes 'playing', generate the board from seed
    useEffect(() => {
        if (phase === 'playing' && room?.board_seed && trie && dictionaryLoaded) {
            const newBoard = generateBoardWithSeed(room.board_seed);
            setBoard(newBoard);
        }
    }, [phase, room?.board_seed, trie, dictionaryLoaded]);

    // Register the end-game callback with the room hook so the timer can trigger it
    useEffect(() => {
        setOnTimerExpired(endMultiplayerGame);
    }, [setOnTimerExpired, endMultiplayerGame]);

    const handleSubmit = () => {
        const res = submitWord(currInput);
        if (res.status === 'valid' || res.status === 'invalid' || res.status === 'duplicate' || res.status === 'too_short') {
            setCurrInput('');
        }
    };

    const handleTileClick = (letter: string) => {
        if (phase === 'playing') setCurrInput(prev => prev + letter);
    };

    const handleCreate = async () => {
        await createRoom();
    };

    const handleJoin = async (code: string) => {
        await joinRoom(code);
    };

    const handleLeave = () => {
        leaveRoom();
        setBoard([]);
        setCurrInput('');
    };

    const isHost = room?.host_user_id === user.id;

    // Entry modal (idle phase)
    if (phase === 'idle') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <MultiplayerEntryModal
                    isOpen={true}
                    onClose={onExit}
                    onCreateRoom={handleCreate}
                    onJoinRoom={handleJoin}
                    isLoading={isLoading}
                    error={error}
                />
            </div>
        );
    }

    // Lobby
    if (phase === 'lobby') {
        return (
            <div className="flex flex-col items-center pt-8 px-4">
                {room && (
                    <MultiplayerLobby
                        room={room}
                        players={players}
                        myUserId={user.id}
                        isHost={isHost}
                        isLoading={isLoading}
                        onStart={startGame}
                        onLeave={handleLeave}
                    />
                )}
            </div>
        );
    }

    // Results
    if (phase === 'results') {
        return (
            <div className="flex flex-col items-center pt-8 px-4">
                <MultiplayerResultsScreen
                    players={players}
                    myUserId={user.id}
                    isHost={isHost}
                    onPlayAgain={async () => { handleLeave(); await handleCreate(); }}
                    onLeave={handleLeave}
                />
            </div>
        );
    }

    // Playing
    return (
        <div className="w-full">
            {/* Status bar */}
            <motion.div
                className="mb-4 flex items-center justify-between bg-[#1A3C34] text-[#F9F7F1] rounded-xl px-5 py-3"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="text-sm font-mono text-[#8A9A90] uppercase tracking-wider">
                    Multiplayer · Room {room?.room_code}
                </div>
                <div className="text-sm font-semibold text-[#D4AF37]">{statusMessage}</div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Score + Timer + Opponent tracker */}
                <div className="lg:col-span-3 flex flex-col gap-4">
                    {/* Score */}
                    <div className="bg-[#1A3C34] rounded-2xl p-5 text-center">
                        <div className="text-xs font-mono uppercase tracking-widest text-[#8A9A90] mb-2">Your Score</div>
                        <div className="text-6xl font-serif font-bold text-[#F9F7F1]">{scores.net}</div>
                        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10 text-sm">
                            <div>
                                <div className="text-green-300 font-bold font-mono">{scores.gross}</div>
                                <div className="text-[10px] text-[#8A9A90] uppercase tracking-wider">Gross</div>
                            </div>
                            <div>
                                <div className="text-red-300 font-bold font-mono">-{Math.abs(scores.penalty)}</div>
                                <div className="text-[10px] text-[#8A9A90] uppercase tracking-wider">Penalty</div>
                            </div>
                        </div>
                    </div>

                    {/* Timer */}
                    <div className="bg-white rounded-xl p-4 border border-[#E6E4DD]">
                        <Timer timeLeft={timeLeft} gameActive={phase === 'playing'} />
                    </div>

                    {/* Opponent tracker */}
                    <MultiplayerOpponentTracker
                        players={players}
                        wordCounts={wordCounts}
                        myUserId={user.id}
                    />
                </div>

                {/* Center: Board */}
                <div className="lg:col-span-6 flex flex-col items-center justify-center gap-6">
                    <Board
                        board={board}
                        onTileClick={handleTileClick}
                        disabled={phase !== 'playing'}
                    />

                    <WordInput
                        currInput={currInput}
                        setCurrInput={setCurrInput}
                        onSubmit={handleSubmit}
                        gameActive={phase === 'playing'}
                        statusMessage={statusMessage}
                    />
                </div>

                {/* Right: Word lists */}
                <div className="lg:col-span-3">
                    <FoundWordsList foundWords={foundWords} penalizedWords={penalizedWords} />
                </div>
            </div>
        </div>
    );
}
