import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { getSessionUser } from '@/lib/auth/session';

// POST /api/friends/presence — heartbeat, called every ~60s by signed-in clients
export async function POST(req: NextRequest) {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });

    const db = getSupabaseAdmin();
    await db
        .from('friend_presence')
        .upsert({ user_id: user.id, last_seen_at: new Date().toISOString() }, { onConflict: 'user_id' });

    return NextResponse.json({ ok: true });
}
