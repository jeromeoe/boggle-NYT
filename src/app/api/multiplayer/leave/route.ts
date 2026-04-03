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

    const { data: room } = await supabase
        .from('multiplayer_rooms')
        .select('host_user_id, status')
        .eq('id', room_id)
        .single();

    if (!room) return NextResponse.json({ ok: true }); // already gone

    if (room.host_user_id === payload.sub) {
        // Host leaving → delete entire room (cascades to players)
        await supabase.from('multiplayer_rooms').delete().eq('id', room_id);
    } else {
        // Guest leaving → remove their player row
        await supabase
            .from('multiplayer_players')
            .delete()
            .eq('room_id', room_id)
            .eq('user_id', payload.sub);
    }

    return NextResponse.json({ ok: true });
}
