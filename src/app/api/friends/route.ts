import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { getSessionUser } from '@/lib/auth/session';

// GET /api/friends — list accepted friends + their rating + presence
export async function GET(req: NextRequest) {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getSupabaseAdmin();

    const { data, error } = await db
        .from('friendships')
        .select(`
            id,
            status,
            requester_id,
            addressee_id,
            requester:users!friendships_requester_id_fkey(id, username, display_name),
            addressee:users!friendships_addressee_id_fkey(id, username, display_name)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Flatten to the "other" person's profile
    const friendIds = (data ?? []).map(f =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    if (friendIds.length === 0) return NextResponse.json({ friends: [] });

    const [ratingsRes, presenceRes] = await Promise.all([
        db.from('user_ratings').select('user_id, rating').in('user_id', friendIds),
        db.from('friend_presence').select('user_id, last_seen_at').in('user_id', friendIds),
    ]);

    const ratingMap = Object.fromEntries((ratingsRes.data ?? []).map(r => [r.user_id, r.rating]));
    const presenceMap = Object.fromEntries((presenceRes.data ?? []).map(p => [p.user_id, p.last_seen_at]));

    const ONLINE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

    const friends = (data ?? []).map(f => {
        const isRequester = f.requester_id === user.id;
        type UserShape = { id: string; username: string; display_name: string | null };
        const friend = (isRequester ? f.addressee : f.requester) as unknown as UserShape;
        const lastSeen = presenceMap[friend.id];
        const isOnline = lastSeen
            ? Date.now() - new Date(lastSeen).getTime() < ONLINE_THRESHOLD_MS
            : false;
        return {
            friendship_id: f.id,
            user_id: friend.id,
            username: friend.username,
            display_name: friend.display_name,
            rating: ratingMap[friend.id] ?? 800,
            is_online: isOnline,
            last_seen_at: lastSeen ?? null,
        };
    });

    // Sort: online first, then by rating desc
    friends.sort((a, b) => {
        if (a.is_online !== b.is_online) return a.is_online ? -1 : 1;
        return b.rating - a.rating;
    });

    return NextResponse.json({ friends });
}

// POST /api/friends — send a friend request by username
export async function POST(req: NextRequest) {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const username = body?.username?.trim()?.toLowerCase();
    if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 });

    const db = getSupabaseAdmin();

    const { data: target } = await db
        .from('users')
        .select('id, username, display_name')
        .eq('username', username)
        .single();

    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (target.id === user.id) return NextResponse.json({ error: 'Cannot friend yourself' }, { status: 400 });

    // Check for existing relationship in either direction
    const { data: existing } = await db
        .from('friendships')
        .select('id, status')
        .or(
            `and(requester_id.eq.${user.id},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${user.id})`
        )
        .maybeSingle();

    if (existing) {
        if (existing.status === 'accepted') return NextResponse.json({ error: 'Already friends' }, { status: 409 });
        if (existing.status === 'pending') return NextResponse.json({ error: 'Request already sent' }, { status: 409 });
        if (existing.status === 'blocked') return NextResponse.json({ error: 'Cannot send request' }, { status: 403 });
    }

    const { error } = await db.from('friendships').insert({
        requester_id: user.id,
        addressee_id: target.id,
        status: 'pending',
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ message: `Friend request sent to ${target.display_name ?? target.username}` });
}
