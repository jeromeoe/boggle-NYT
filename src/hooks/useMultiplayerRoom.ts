"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { MultiplayerRoom, MultiplayerPlayer, SubmitPayload, MultiplayerBroadcastEvent } from "@/lib/multiplayer/types";

export type MultiplayerPhase = "idle" | "lobby" | "playing" | "results";

const GAME_DURATION = 180;

interface State {
    room: MultiplayerRoom | null;
    players: MultiplayerPlayer[];
    phase: MultiplayerPhase;
    wordCounts: Record<string, number>;
    timeLeft: number;
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
        error: null,
        isLoading: false,
    });

    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeMsRef = useRef<number | null>(null);
    const lastBroadcastRef = useRef(0);
    const onTimerExpiredRef = useRef<(() => void) | null>(null);

    const setError = (error: string) => setState(s => ({ ...s, error, isLoading: false }));

    // ── Subscribe to room + player changes via Realtime ──────────────────────
    const subscribe = useCallback((roomId: string, roomCode: string) => {
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
                return {
                    ...s,
                    players: [...s.players, {
                        id: '', room_id: roomId,
                        user_id: payload.player.user_id,
                        username: payload.player.username,
                        display_name: payload.player.display_name,
                        joined_at: new Date().toISOString(),
                        finished_at: null, gross_score: null, penalty_score: null,
                        net_score: null, words_found: null, words_penalized: null, is_dnf: false,
                    }],
                };
            });
        });

        channel.on('broadcast', { event: 'player_left' }, ({ payload }: { payload: MultiplayerBroadcastEvent }) => {
            if (payload.type !== 'player_left') return;
            setState(s => ({
                ...s,
                players: s.players.map(p => p.user_id === payload.user_id ? { ...p, is_dnf: true } : p),
            }));
        });

        // game_started: broadcast by host after /api/multiplayer/start succeeds
        // This is the PRIMARY mechanism for all clients to transition to playing.
        channel.on('broadcast', { event: 'game_started' }, ({ payload }: { payload: { board_seed: number; start_time: string } }) => {
            startTimeMsRef.current = new Date(payload.start_time).getTime();
            setState(s => ({
                ...s,
                room: s.room ? { ...s.room, status: 'playing', board_seed: payload.board_seed, start_time: payload.start_time } : s.room,
                phase: 'playing',
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

        channel.subscribe();

        channelRef.current = channel;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        setState(s => ({ ...s, room, players: data.players, phase: 'lobby', isLoading: false }));
        subscribe(data.room_id, data.room_code);
    }, [myUserId, subscribe]);

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
        setState(s => ({ ...s, room, players: data.players, phase: 'lobby', isLoading: false }));
        subscribe(data.room_id, data.room_code);

        // Announce arrival to other clients in the lobby
        channelRef.current?.send({
            type: 'broadcast',
            event: 'player_joined',
            payload: {
                type: 'player_joined',
                player: { user_id: myUserId, username: data.players.find((p: MultiplayerPlayer) => p.user_id === myUserId)?.username ?? '', display_name: null },
            } satisfies MultiplayerBroadcastEvent,
        });
    }, [myUserId, subscribe]);

    const startGame = useCallback(async () => {
        if (!state.room) return;
        setState(s => ({ ...s, isLoading: true, error: null }));

        const res = await fetch('/api/multiplayer/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room_id: state.room.id }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? 'Failed to start game'); return; }

        // Broadcast game_started to ALL clients (including self) via the channel.
        // This is the reliable path — postgres_changes can be flaky.
        channelRef.current?.send({
            type: 'broadcast',
            event: 'game_started',
            payload: { board_seed: data.board_seed, start_time: data.start_time },
        });

        // Also transition the host immediately (don't wait for broadcast round-trip)
        startTimeMsRef.current = new Date(data.start_time).getTime();
        setState(s => ({
            ...s,
            isLoading: false,
            room: s.room ? { ...s.room, status: 'playing', board_seed: data.board_seed, start_time: data.start_time } : s.room,
            phase: 'playing',
        }));
        startTimer();
    }, [state.room, startTimer]);

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
        setState({ room: null, players: [], phase: 'idle', wordCounts: {}, timeLeft: GAME_DURATION, error: null, isLoading: false });
    }, [myUserId, state.room?.id]);

    return {
        ...state,
        createRoom,
        joinRoom,
        startGame,
        submitResult,
        broadcastWordCount,
        leaveRoom,
        setOnTimerExpired,
    };
}
