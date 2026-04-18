import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { getSessionUser } from '@/lib/auth/session';

// GET /api/friends/pending — incoming friend requests
export async function GET(req: NextRequest) {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getSupabaseAdmin();
    const { data, error } = await db
        .from('friendships')
        .select(`
            id,
            requester:users!friendships_requester_id_fkey(id, username, display_name)
        `)
        .eq('addressee_id', user.id)
        .eq('status', 'pending');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ requests: data ?? [] });
}
