import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { verifyToken, SESSION_COOKIE } from '@/lib/auth/jwt';

const schema = z.object({
    room_id: z.string().uuid(),
    gross_score: z.number().int(),
    penalty_score: z.number().int(),
    net_score: z.number().int(),
    words_found: z.array(z.string()),
    words_penalized: z.array(z.string()),
});

const GAME_DURATION_S = 180;
const GRACE_PERIOD_S = 30;

export async function POST(req: NextRequest) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    let payload;
    try { payload = await verifyToken(token); }
    catch { return NextResponse.json({ error: 'Invalid session' }, { status: 401 }); }

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { room_id, gross_score, penalty_score, net_score, words_found, words_penalized } = parsed.data;

    // Verify player is in this room
    const { data: player, error: playerErr } = await supabase
        .from('multiplayer_players')
        .select('*')
        .eq('room_id', room_id)
        .eq('user_id', payload.sub)
        .single();

    if (playerErr || !player) return NextResponse.json({ error: 'Not in this room' }, { status: 403 });
    if (player.finished_at) return NextResponse.json({ error: 'Already submitted' }, { status: 409 });

    // Verify room is playing
    const { data: room } = await supabase
        .from('multiplayer_rooms')
        .select('*')
        .eq('id', room_id)
        .single();

    if (!room || room.status !== 'playing') return NextResponse.json({ error: 'Game not in progress' }, { status: 409 });

    const now = new Date();
    const finishedAt = now.toISOString();

    // Record this player's result
    await supabase
        .from('multiplayer_players')
        .update({ gross_score, penalty_score, net_score, words_found, words_penalized, finished_at: finishedAt })
        .eq('id', player.id);

    // Check grace period: if now > start_time + 180s + 30s, mark stragglers as DNF
    if (room.start_time) {
        const deadline = new Date(room.start_time).getTime() + (GAME_DURATION_S + GRACE_PERIOD_S) * 1000;
        if (now.getTime() > deadline) {
            await supabase
                .from('multiplayer_players')
                .update({ is_dnf: true, finished_at: finishedAt })
                .eq('room_id', room_id)
                .is('finished_at', null);
        }
    }

    // Check if all players are now done
    const { count: remaining } = await supabase
        .from('multiplayer_players')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room_id)
        .is('finished_at', null);

    if ((remaining ?? 0) === 0) {
        await supabase
            .from('multiplayer_rooms')
            .update({ status: 'finished', finished_at: finishedAt })
            .eq('id', room_id);
    }

    return NextResponse.json({ ok: true });
}
