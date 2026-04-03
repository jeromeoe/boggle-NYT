import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { verifyToken, SESSION_COOKIE } from '@/lib/auth/jwt';

const schema = z.object({
    board_type: z.enum(['random']),
});

// 4-char codes — no ambiguous chars (0/O, 1/I/L)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRoomCode(): string {
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    return code;
}

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

    // Fire-and-forget: clean up abandoned rooms
    void supabase.rpc('cleanup_abandoned_rooms');

    // Generate unique room code (retry on collision)
    let roomCode = '';
    let room = null;
    for (let attempt = 0; attempt < 5; attempt++) {
        roomCode = generateRoomCode();
        const { data, error } = await supabase
            .from('multiplayer_rooms')
            .insert({
                room_code: roomCode,
                host_user_id: payload.sub,
                board_type: parsed.data.board_type,
                status: 'waiting',
            })
            .select()
            .single();

        if (!error) { room = data; break; }
        if (error.code !== '23505') {
            return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
        }
        // 23505 = unique violation on room_code — retry
    }

    if (!room) return NextResponse.json({ error: 'Could not generate unique room code' }, { status: 500 });

    // Add host as first player
    await supabase.from('multiplayer_players').insert({
        room_id: room.id,
        user_id: payload.sub,
        username: payload.username,
        display_name: payload.display_name,
    });

    const { data: players } = await supabase
        .from('multiplayer_players')
        .select('*')
        .eq('room_id', room.id);

    return NextResponse.json({ room_code: room.room_code, room_id: room.id, players: players ?? [], status: 'waiting' });
}
