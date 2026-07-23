import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { verifyToken, SESSION_COOKIE } from '@/lib/auth/jwt';

const schema = z.object({ room_id: z.string().uuid() });
const FINALIZE_AFTER_MS = 190_000;

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
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { room_id } = parsed.data;
    const [{ data: player }, { data: room }] = await Promise.all([
        supabase
            .from('multiplayer_players')
            .select('id')
            .eq('room_id', room_id)
            .eq('user_id', payload.sub)
            .single(),
        supabase
            .from('multiplayer_rooms')
            .select('id, status, start_time')
            .eq('id', room_id)
            .single(),
    ]);

    if (!player) return NextResponse.json({ error: 'Not in this room' }, { status: 403 });
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    if (room.status === 'finished') return NextResponse.json({ ok: true, alreadyFinished: true });
    if (room.status !== 'playing' || !room.start_time) {
        return NextResponse.json({ error: 'Game not in progress' }, { status: 409 });
    }

    const finalizeAt = new Date(room.start_time).getTime() + FINALIZE_AFTER_MS;
    const nowMs = Date.now();
    if (nowMs < finalizeAt) {
        return NextResponse.json(
            { error: 'Grace period is still active', retryAfterMs: finalizeAt - nowMs },
            { status: 409 },
        );
    }

    const finishedAt = new Date(nowMs).toISOString();
    const { error: dnfError } = await supabase
        .from('multiplayer_players')
        .update({ is_dnf: true, finished_at: finishedAt })
        .eq('room_id', room_id)
        .is('finished_at', null);
    if (dnfError) {
        console.error('Failed to mark multiplayer stragglers:', dnfError);
        return NextResponse.json({ error: 'Failed to finalize room' }, { status: 500 });
    }

    const { error: roomError } = await supabase
        .from('multiplayer_rooms')
        .update({ status: 'finished', finished_at: finishedAt })
        .eq('id', room_id)
        .eq('status', 'playing');
    if (roomError) {
        console.error('Failed to finish multiplayer room:', roomError);
        return NextResponse.json({ error: 'Failed to finalize room' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
