import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { verifyToken, SESSION_COOKIE } from '@/lib/auth/jwt';

const schema = z.object({
    room_id: z.string().uuid(),
});

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
    const { room_id } = parsed.data;

    const { data: room, error: roomErr } = await supabase
        .from('multiplayer_rooms')
        .select('*')
        .eq('id', room_id)
        .single();

    if (roomErr || !room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    if (room.host_user_id !== payload.sub) return NextResponse.json({ error: 'Only the host can start the game' }, { status: 403 });
    if (room.status !== 'waiting') return NextResponse.json({ error: 'Game already started' }, { status: 409 });

    const { count } = await supabase
        .from('multiplayer_players')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room_id);

    if ((count ?? 0) < 2) return NextResponse.json({ error: 'Need at least 2 players to start' }, { status: 400 });

    const boardSeed = Math.floor(Math.random() * 2 ** 31);
    const startTime = new Date().toISOString();

    const { error: updateErr } = await supabase
        .from('multiplayer_rooms')
        .update({ status: 'playing', board_seed: boardSeed, start_time: startTime })
        .eq('id', room_id);

    if (updateErr) return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });

    // Clients detect the status change via postgres_changes subscription — no broadcast needed.
    return NextResponse.json({ board_seed: boardSeed, start_time: startTime });
}
