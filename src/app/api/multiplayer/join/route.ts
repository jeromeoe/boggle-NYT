import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { verifyToken, SESSION_COOKIE } from '@/lib/auth/jwt';

const schema = z.object({
    room_code: z.string().length(4),
});

export async function POST(req: NextRequest) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    let payload;
    try { payload = await verifyToken(token); }
    catch { return NextResponse.json({ error: 'Invalid session' }, { status: 401 }); }

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid room code' }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const code = parsed.data.room_code.toUpperCase();

    const { data: room, error: roomErr } = await supabase
        .from('multiplayer_rooms')
        .select('*')
        .eq('room_code', code)
        .single();

    if (roomErr || !room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    if (room.status !== 'waiting') return NextResponse.json({ error: 'Game already started' }, { status: 409 });

    // Check player count
    const { count } = await supabase
        .from('multiplayer_players')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id);

    if ((count ?? 0) >= 8) return NextResponse.json({ error: 'Room is full' }, { status: 403 });

    // Upsert — handles re-joins gracefully
    await supabase.from('multiplayer_players').upsert(
        {
            room_id: room.id,
            user_id: payload.sub,
            username: payload.username,
            display_name: payload.display_name,
        },
        { onConflict: 'room_id,user_id' }
    );

    const { data: players } = await supabase
        .from('multiplayer_players')
        .select('*')
        .eq('room_id', room.id)
        .order('joined_at', { ascending: true });

    return NextResponse.json({
        room_id: room.id,
        room_code: room.room_code,
        host_user_id: room.host_user_id,
        status: room.status,
        players: players ?? [],
    });
}
