import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { getSessionUser } from '@/lib/auth/session';

const schema = z.object({ room_id: z.string().uuid() });

// POST /api/multiplayer/reset
// Host-only. Resets a finished room back to 'waiting' and clears all player scores.
// Everyone stays in the same channel — no new room code needed.
export async function POST(req: NextRequest) {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

    const db = getSupabaseAdmin();
    const { room_id } = parsed.data;

    const { data: room, error: roomErr } = await db
        .from('multiplayer_rooms')
        .select('host_user_id, status')
        .eq('id', room_id)
        .single();

    if (roomErr || !room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    if (room.host_user_id !== user.id) return NextResponse.json({ error: 'Only the host can reset' }, { status: 403 });
    if (room.status !== 'finished') return NextResponse.json({ error: 'Room is not finished' }, { status: 409 });

    // Reset room back to waiting
    const { error: resetErr } = await db
        .from('multiplayer_rooms')
        .update({ status: 'waiting', board_seed: null, start_time: null, finished_at: null })
        .eq('id', room_id);

    if (resetErr) return NextResponse.json({ error: 'Failed to reset room' }, { status: 500 });

    // Clear all player scores so results are fresh
    const { error: clearErr } = await db
        .from('multiplayer_players')
        .update({
            gross_score: null,
            penalty_score: null,
            net_score: null,
            words_found: null,
            words_penalized: null,
            finished_at: null,
            is_dnf: false,
        })
        .eq('room_id', room_id);

    if (clearErr) return NextResponse.json({ error: 'Failed to reset players' }, { status: 500 });

    return NextResponse.json({ ok: true });
}
