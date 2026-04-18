"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { MultiplayerRoom, MultiplayerPlayer, SubmitPayload, MultiplayerBroadcastEvent } from "@/lib/multiplayer/types";

export type MultiplayerPhase = "idle" | "lobby" | "countdown" | "playing" | "results";

const GAME_DURATION = 180;

interface State {
    room: MultiplayerRoom | null;
    players: MultiplayerPlayer[];
    phase: MultiplayerPhase;
    wordCounts: Record<string, number>;
    timeLeft: number;
    countdown: number | null;  // 3, 2, 1, null
    error: string | null;
    isLoading: boolean;
}

export function useMultiplayerRoom(myUserId: string | null) {
    const [state, setState] = useState<State>({
        room: null,
        players: [],
        phase: "idle",
        wordCounts: {},
        timeLeft: GAME_DURATION,
        countdown: null,
        error: null,
        isLoading: false,
    });

    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lobbyPollRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeMsRef = useRef<number | null>(null);
    const lastBroadcastRef = useRef(0);
    const onTimerExpiredRef = useRef<(() => void) | null>(null);
    const currentRoomIdRef = useRef<string | null>(null);

    const setError = (error: string) => setState(s => ({ ...s, error, isLoading: false }));

    const runCountdown = useCallback((onDone: () => void) => {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        setState(s => ({ ...s, phase: 'countdown', countdown: 3 }));
        let tick = 3;
        countdownTimerRef.current = setInterval(() => {
            tick -= 1;
            if (tick <= 0) {
                clearInterval(countdownTimerRef.current!);
                countdownTimerRef.current = null;
                setState(s => ({ ...s, countdown: null }));
                onDone();
            } else {
                setState(s => ({ ...s, countdown: tick }));
            }
        }, 1000);
    }, []);

    // ── Subscribe to room + player changes via Realtime ──────────────────────
    // Returns a Promise that resolves once the channel is confirmed SUBSCRIBED.
    const subscribe = useCallback((roomId: string, roomCode: string): Promise<void> => {
        // Clean up any existing subscription
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
        }

        const channel = supabase.channel(`room:${roomCode}`);

        // Broadcast: live word counts, player join/leave
        channel.on('broadcast', { event: 'word_count_update' }, ({ payload }: { payload: MultiplayerBroadcastEvent }) => {
            if (payload.type !== 'word_count_update') return;
            setState(s => ({ ...s, wordCounts: { ...s.wordCounts, [payload.user_id]: payload.count } }));
        });

        channel.on('broadcast', { event: 'player_joined' }, ({ payload }: { payload: MultiplayerBroadcastEvent }) => {
            if (payload.type !== 'player_joined') return;
            setState(s => {
                if (s.players.some(p => p.user_id === payload.player.user_id)) return s;
                return { ...s, players: [...s.players, payload.player] };
            });
        });

        channel.on('broadcast', { event: 'player_left' }, ({ payload }: { payload: MultiplayerBroadcastEvent }) => {
            if (payload.type !== 'player_left') return;
            setState(s => ({
                ...s,
                players: s.players.map(p => p.user_id === payload.user_id ? { ...p, is_dnf: true } : p),
            }));
        });

        // countdown_started: host clicked Start — show 3-2-1 on all clients
        channel.on('broadcast', { event: 'countdown_started' }, () => {
            runCountdown(() => {/* game_started broadcast will follow */});
        });

        // room_reset: host clicked Play Again — go back to lobby, clear scores
        channel.on('broadcast', { event: 'room_reset' }, () => {
            setState(s => ({
                ...s,
                phase: 'lobby',
                countdown: null,
                wordCounts: {},
                timeLeft: GAME_DURATION,
                players: s.players.map(p => ({
                    ...p,
                    gross_score: null, penalty_score: null, net_score: null,
                    words_found: null, words_penalized: null,
                    finished_at: null, is_dnf: false,
                })),
                room: s.room ? { ...s.room, status: 'waiting', board_seed: null, start_time: null, finished_at: null } : s.room,
            }));
        });

        // game_started: fires after countdown completes
        channel.on('broadcast', { event: 'game_started' }, ({ payload }: { payload: { board_seed: number; start_time: string } }) => {
            if (lobbyPollRef.current) { clearInterval(lobbyPollRef.current); lobbyPollRef.current = null; }
            startTimeMsRef.current = new Date(payload.start_time).getTime();
            setState(s => ({
                ...s,
                room: s.room ? { ...s.room, status: 'playing', board_seed: payload.board_seed, start_time: payload.start_time } : s.room,
                phase: 'playing',
                countdown: null,
            }));
            startTimer();
        });

        // postgres_changes: room status flips (waiting → playing → finished)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (channel as any).on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'multiplayer_rooms',
            filter: `id=eq.${roomId}`,
        }, ({ new: updated }: { new: MultiplayerRoom }) => {
            setState(s => ({ ...s, room: updated }));
            if (updated.status === 'playing' && updated.start_time) {
                startTimeMsRef.current = new Date(updated.start_time).getTime();
                setState(s => ({ ...s, phase: 'playing' }));
                startTimer();
            }
            if (updated.status === 'finished') {
                stopTimer();
                supabase
                    .from('multiplayer_players')
                    .select('*')
                    .eq('room_id', roomId)
                    .order('net_score', { ascending: false })
                    .then(({ data }) => {
                        setState(s => ({ ...s, phase: 'results', players: data ?? s.players }));
                    });
            }
        });

        // postgres_changes: player joins + score updates
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (channel as any).on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'multiplayer_players',
            filter: `room_id=eq.${roomId}`,
        }, ({ new: updated }: { new: MultiplayerPlayer }) => {
            setState(s => {
                if (s.players.some(p => p.user_id === updated.user_id)) return s;
                return { ...s, players: [...s.players, updated] };
            });
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (channel as any).on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'multiplayer_players',
            filter: `room_id=eq.${roomId}`,
        }, ({ new: updated }: { new: MultiplayerPlayer }) => {
            setState(s => ({
                ...s,
                players: s.players.map(p => p.user_id === updated.user_id ? updated : p),
            }));
        });

        channelRef.current = channel;

        return new Promise<void>((resolve, reject) => {
            channel.subscribe((status) => {
                if (status === 'SUBSCRIBED') resolve();
                else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(new Error(`Channel ${status}`));
            });
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Poll the DB for latest player list while in lobby — safety net if Realtime misses a broadcast
    const startLobbyPoll = useCallback((roomId: string) => {
        if (lobbyPollRef.current) clearInterval(lobbyPollRef.current);
        lobbyPollRef.current = setInterval(async () => {
            const { data } = await supabase
                .from('multiplayer_players')
                .select('*')
                .eq('room_id', roomId);
            if (data && data.length > 0) {
                setState(s => {
                    if (s.phase !== 'lobby') { clearInterval(lobbyPollRef.current!); lobbyPollRef.current = null; return s; }
                    // Merge: add any players not yet in state
                    const existing = new Set(s.players.map(p => p.user_id));
                    const newPlayers = data.filter((p: MultiplayerPlayer) => !existing.has(p.user_id));
                    if (newPlayers.length === 0) return s;
                    return { ...s, players: [...s.players, ...newPlayers] };
                });
            }
        }, 3000);
    }, []);

    const startTimer = useCallback(() => {
        stopTimer();
        timerRef.current = setInterval(() => {
            if (startTimeMsRef.current === null) return;
            const elapsed = Math.floor((Date.now() - startTimeMsRef.current) / 1000);
            const remaining = Math.max(0, GAME_DURATION - elapsed);
            setState(s => ({ ...s, timeLeft: remaining }));
            if (remaining === 0) {
                stopTimer();
                onTimerExpiredRef.current?.();
            }
        }, 1000);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    function stopTimer() {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }

    // Expose a way for MultiplayerView to register the end-game callback
    const setOnTimerExpired = useCallback((fn: () => void) => {
        onTimerExpiredRef.current = fn;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopTimer();
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            if (lobbyPollRef.current) clearInterval(lobbyPollRef.current);
            if (channelRef.current) supabase.removeChannel(channelRef.current);
        };
    }, []);

    // ── Actions ───────────────────────────────────────────────────────────────

    const createRoom = useCallback(async () => {
        if (!myUserId) { setError('You must be signed in'); return; }
        setState(s => ({ ...s, isLoading: true, error: null }));

        const res = await fetch('/api/multiplayer/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ board_type: 'random' }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? 'Failed to create room'); return; }

        const room: MultiplayerRoom = {
            id: data.room_id,
            room_code: data.room_code,
            host_user_id: myUserId,
            status: 'waiting',
            board_seed: null,
            start_time: null,
            board_type: 'random',
            created_at: new Date().toISOString(),
            finished_at: null,
        };
        currentRoomIdRef.current = data.room_id;
        setState(s => ({ ...s, room, players: data.players, phase: 'lobby', isLoading: false }));
        await subscribe(data.room_id, data.room_code);
        startLobbyPoll(data.room_id);
    }, [myUserId, subscribe, startLobbyPoll]);

    const joinRoom = useCallback(async (code: string) => {
        if (!myUserId) { setError('You must be signed in'); return; }
        setState(s => ({ ...s, isLoading: true, error: null }));

        const res = await fetch('/api/multiplayer/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room_code: code }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? 'Failed to join room'); return; }

        const room: MultiplayerRoom = {
            id: data.room_id,
            room_code: data.room_code,
            host_user_id: data.host_user_id,
            status: data.status,
            board_seed: null,
            start_time: null,
            board_type: 'random',
            created_at: new Date().toISOString(),
            finished_at: null,
        };
        currentRoomIdRef.current = data.room_id;
        setState(s => ({ ...s, room, players: data.players, phase: 'lobby', isLoading: false }));

        // Wait for channel to be fully subscribed BEFORE broadcasting —
        // sending before SUBSCRIBED means the message is dropped silently.
        await subscribe(data.room_id, data.room_code);
        startLobbyPoll(data.room_id);

        // Broadcast the full player record so the host gets all fields, not just a partial
        const me = (data.players as MultiplayerPlayer[]).find(p => p.user_id === myUserId);
        if (me) {
            channelRef.current?.send({
                type: 'broadcast',
                event: 'player_joined',
                payload: { type: 'player_joined', player: me } satisfies MultiplayerBroadcastEvent,
            });
        }
    }, [myUserId, subscribe, startLobbyPoll]);

    const startGame = useCallback(async () => {
        if (!state.room) return;
        setState(s => ({ ...s, isLoading: true, error: null }));

        // Broadcast countdown to all clients (including host), then start after 3s
        channelRef.current?.send({ type: 'broadcast', event: 'countdown_started', payload: { type: 'countdown_started' } });
        runCountdown(async () => {
            const res = await fetch('/api/multiplayer/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ room_id: state.room!.id }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? 'Failed to start game'); return; }

            channelRef.current?.send({
                type: 'broadcast',
                event: 'game_started',
                payload: { board_seed: data.board_seed, start_time: data.start_time },
            });

            if (lobbyPollRef.current) { clearInterval(lobbyPollRef.current); lobbyPollRef.current = null; }
            startTimeMsRef.current = new Date(data.start_time).getTime();
            setState(s => ({
                ...s,
                isLoading: false,
                room: s.room ? { ...s.room, status: 'playing', board_seed: data.board_seed, start_time: data.start_time } : s.room,
                phase: 'playing',
                countdown: null,
            }));
            startTimer();
        });
    }, [state.room, startTimer, runCountdown]);

    const resetRoom = useCallback(async () => {
        if (!state.room) return;
        setState(s => ({ ...s, isLoading: true, error: null }));

        const res = await fetch('/api/multiplayer/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room_id: state.room.id }),
        });
        if (!res.ok) { setError('Failed to reset room'); return; }

        // Broadcast reset to all clients so they return to lobby
        channelRef.current?.send({ type: 'broadcast', event: 'room_reset', payload: { type: 'room_reset' } });

        // Host transitions immediately
        setState(s => ({
            ...s,
            isLoading: false,
            phase: 'lobby',
            countdown: null,
            wordCounts: {},
            timeLeft: GAME_DURATION,
            players: s.players.map(p => ({
                ...p,
                gross_score: null, penalty_score: null, net_score: null,
                words_found: null, words_penalized: null,
                finished_at: null, is_dnf: false,
            })),
            room: s.room ? { ...s.room, status: 'waiting', board_seed: null, start_time: null, finished_at: null } : s.room,
        }));
        if (currentRoomIdRef.current) startLobbyPoll(currentRoomIdRef.current);
    }, [state.room, startLobbyPoll]);

    const submitResult = useCallback(async (payload: SubmitPayload) => {
        const res = await fetch('/api/multiplayer/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) console.error('Failed to submit result');
        // Phase transitions to 'results' when postgres_changes fires room status='finished'
    }, []);

    const broadcastWordCount = useCallback((count: number) => {
        const now = Date.now();
        if (now - lastBroadcastRef.current < 1000) return;
        lastBroadcastRef.current = now;
        channelRef.current?.send({
            type: 'broadcast',
            event: 'word_count_update',
            payload: { type: 'word_count_update', user_id: myUserId ?? '', count } satisfies MultiplayerBroadcastEvent,
        });
    }, [myUserId]);

    const leaveRoom = useCallback(() => {
        stopTimer();
        if (lobbyPollRef.current) { clearInterval(lobbyPollRef.current); lobbyPollRef.current = null; }
        currentRoomIdRef.current = null;

        // Tell the server to destroy (if host) or remove player (if guest)
        if (state.room?.id) {
            void fetch('/api/multiplayer/leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ room_id: state.room.id }),
            });
        }

        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'player_left',
                payload: { type: 'player_left', user_id: myUserId ?? '' } satisfies MultiplayerBroadcastEvent,
            });
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }
        setState({ room: null, players: [], phase: 'idle', wordCounts: {}, timeLeft: GAME_DURATION, countdown: null, error: null, isLoading: false });
    }, [myUserId, state.room?.id]);

    return {
        ...state,
        createRoom,
        joinRoom,
        startGame,
        resetRoom,
        submitResult,
        broadcastWordCount,
        leaveRoom,
        setOnTimerExpired,
    };
}
