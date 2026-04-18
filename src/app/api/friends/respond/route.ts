import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { getSessionUser } from '@/lib/auth/session';

// POST /api/friends/respond — accept or decline a pending request
export async function POST(req: NextRequest) {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const { friendship_id, action } = body ?? {};

    if (!friendship_id || !['accept', 'decline'].includes(action)) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    const { data: friendship } = await db
        .from('friendships')
        .select('id, addressee_id, status')
        .eq('id', friendship_id)
        .single();

    if (!friendship) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    if (friendship.addressee_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (friendship.status !== 'pending') return NextResponse.json({ error: 'Request already handled' }, { status: 409 });

    if (action === 'decline') {
        await db.from('friendships').delete().eq('id', friendship_id);
        return NextResponse.json({ message: 'Request declined' });
    }

    const { error } = await db
        .from('friendships')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', friendship_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ message: 'Friend request accepted' });
}
