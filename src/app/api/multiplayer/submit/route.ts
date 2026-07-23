import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateBoardWithSeed } from '@/lib/boggle/dice';
import { findAllWords } from '@/lib/boggle/solver';
import { getServerDictionary } from '@/lib/boggle/server-dictionary';
import { canonicalizeSubmission, SubmissionValidationError } from '@/lib/boggle/submission';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { verifyToken, SESSION_COOKIE } from '@/lib/auth/jwt';

const schema = z.object({
    room_id: z.string().uuid(),
    words_found: z.array(z.string().min(3).max(32)).max(512),
    words_penalized: z.array(z.string().min(3).max(32)).max(512),
});

const GAME_DURATION_MS = 180_000;
const EARLY_SUBMIT_TOLERANCE_MS = 3_000;
const MULTIPLAYER_GRACE_MS = 10_000;

export async function POST(req: NextRequest) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    let payload: { sub: string };
    try {
        payload = await verifyToken(token) as { sub: string };
    } catch {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { room_id, words_found, words_penalized } = parsed.data;
    const [{ data: player }, { data: room }] = await Promise.all([
        supabase
            .from('multiplayer_players')
            .select('id, finished_at')
            .eq('room_id', room_id)
            .eq('user_id', payload.sub)
            .single(),
        supabase
            .from('multiplayer_rooms')
            .select('id, status, board_seed, start_time')
            .eq('id', room_id)
            .single(),
    ]);

    if (!player) return NextResponse.json({ error: 'Not in this room' }, { status: 403 });
    if (player.finished_at) return NextResponse.json({ error: 'Already submitted' }, { status: 409 });
    if (!room || room.status !== 'playing' || room.board_seed === null || !room.start_time) {
        return NextResponse.json({ error: 'Game not in progress' }, { status: 409 });
    }

    const startedAtMs = new Date(room.start_time).getTime();
    if (!Number.isFinite(startedAtMs)) {
        return NextResponse.json({ error: 'Room start time is invalid' }, { status: 409 });
    }

    const nowMs = Date.now();
    const submitNotBefore = startedAtMs + GAME_DURATION_MS - EARLY_SUBMIT_TOLERANCE_MS;
    if (nowMs < submitNotBefore) {
        return NextResponse.json(
            { error: 'The round is still in progress', retryAfterMs: submitNotBefore - nowMs },
            { status: 409 },
        );
    }

    try {
        const { trie } = await getServerDictionary();
        const board = generateBoardWithSeed(room.board_seed);
        const possibleWords = findAllWords(board, trie);
        const result = canonicalizeSubmission(possibleWords, words_found, words_penalized);
        const finishedAt = new Date(nowMs).toISOString();

        const { error: updateError } = await supabase
            .from('multiplayer_players')
            .update({
                gross_score: result.grossScore,
                penalty_score: result.penaltyScore,
                net_score: result.netScore,
                words_found: result.wordsFound,
                words_penalized: result.wordsPenalized,
                finished_at: finishedAt,
            })
            .eq('id', player.id)
            .is('finished_at', null);

        if (updateError) throw updateError;

        const { count: remaining } = await supabase
            .from('multiplayer_players')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room_id)
            .is('finished_at', null);

        if ((remaining ?? 0) === 0) {
            await supabase
                .from('multiplayer_rooms')
                .update({ status: 'finished', finished_at: finishedAt })
                .eq('id', room_id)
                .eq('status', 'playing');
            return NextResponse.json({ ok: true, pending: false, score: result.netScore });
        }

        const finalizeAt = startedAtMs + GAME_DURATION_MS + MULTIPLAYER_GRACE_MS;
        return NextResponse.json({
            ok: true,
            pending: true,
            score: result.netScore,
            finalizeAfterMs: Math.max(0, finalizeAt - Date.now()),
        });
    } catch (error) {
        if (error instanceof SubmissionValidationError) {
            return NextResponse.json({ error: error.message }, { status: 422 });
        }
        console.error('Failed to submit multiplayer result:', error);
        return NextResponse.json({ error: 'Failed to submit result' }, { status: 500 });
    }
}
