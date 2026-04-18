import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { getSessionUser } from '@/lib/auth/session';

const schema = z.object({ friend_user_id: z.string().uuid() });

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateRoomCode(): string {
    let code = '';
    for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return code;
}

// POST /api/multiplayer/challenge
// Creates a room and broadcasts an invite to the target friend's personal channel.
export async function POST(req: NextRequest) {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

    const db = getSupabaseAdmin();
    const { friend_user_id } = parsed.data;

    // Verify friendship exists and is accepted
    const { data: friendship } = await db
        .from('friendships')
        .select('id')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${friend_user_id}),and(requester_id.eq.${friend_user_id},addressee_id.eq.${user.id})`)
        .eq('status', 'accepted')
        .maybeSingle();

    if (!friendship) return NextResponse.json({ error: 'Not friends' }, { status: 403 });

    // Create the room
    let roomCode = '';
    let room = null;
    for (let attempt = 0; attempt < 5; attempt++) {
        roomCode = generateRoomCode();
        const { data, error } = await db
            .from('multiplayer_rooms')
            .insert({ room_code: roomCode, host_user_id: user.id, board_type: 'random', status: 'waiting' })
            .select()
            .single();
        if (!error) { room = data; break; }
        if (error.code !== '23505') return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
    }
    if (!room) return NextResponse.json({ error: 'Could not generate room code' }, { status: 500 });

    // Add challenger as first player
    await db.from('multiplayer_players').insert({
        room_id: room.id,
        user_id: user.id,
        username: user.username,
        display_name: user.display_name ?? null,
    });

    const { data: players } = await db.from('multiplayer_players').select('*').eq('room_id', room.id);

    // Insert invite row — the friend's ChallengeNotification subscribes to postgres_changes on this table
    await db.from('challenge_invites').insert({
        room_id: room.id,
        room_code: room.room_code,
        challenger_id: user.id,
        challenger_username: user.username,
        challenger_display_name: user.display_name ?? null,
        invited_user_id: friend_user_id,
    });

    return NextResponse.json({ room_id: room.id, room_code: room.room_code, players: players ?? [] });
}
