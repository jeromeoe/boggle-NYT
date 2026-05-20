import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { getSessionUser } from '@/lib/auth/session';

// GET /api/mail — list all mails for current user (sent + received)
export async function GET(req: NextRequest) {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getSupabaseAdmin();

    const { data, error } = await db
        .from('moggle_mail')
        .select(`
            id, sender_id, recipient_id, parent_id,
            board_letters, board_type, time_seconds,
            sender_gross, sender_penalty, sender_net, sender_words, sender_penalty_words,
            recipient_board_letters, recipient_gross, recipient_penalty, recipient_net,
            recipient_words, recipient_penalty_words, recipient_played_at,
            created_at,
            sender:users!moggle_mail_sender_id_fkey(id, username, display_name),
            recipient:users!moggle_mail_recipient_id_fkey(id, username, display_name)
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ mails: data ?? [] });
}

// POST /api/mail — send a new mail (sender already played)
export async function POST(req: NextRequest) {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

    const {
        recipient_id,
        board_letters,
        board_type = 'closed',
        time_seconds = 180,
        sender_gross = 0,
        sender_penalty = 0,
        sender_net = 0,
        sender_words = [],
        sender_penalty_words = [],
        recipient_board_letters = null,
        parent_id = null,
    } = body;

    if (!recipient_id) return NextResponse.json({ error: 'recipient_id required' }, { status: 400 });
    if (!board_letters) return NextResponse.json({ error: 'board_letters required' }, { status: 400 });
    if (!['closed', 'open', 'random'].includes(board_type)) {
        return NextResponse.json({ error: 'board_type must be closed, open, or random' }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Verify friendship
    const { data: friendship } = await db
        .from('friendships')
        .select('id')
        .eq('status', 'accepted')
        .or(
            `and(requester_id.eq.${user.id},addressee_id.eq.${recipient_id}),and(requester_id.eq.${recipient_id},addressee_id.eq.${user.id})`
        )
        .maybeSingle();

    if (!friendship) return NextResponse.json({ error: 'Not friends with this user' }, { status: 403 });

    const { data: mail, error } = await db
        .from('moggle_mail')
        .insert({
            sender_id: user.id,
            recipient_id,
            parent_id: parent_id ?? null,
            board_letters,
            board_type,
            time_seconds,
            sender_gross,
            sender_penalty,
            sender_net,
            sender_words,
            sender_penalty_words,
            recipient_board_letters: recipient_board_letters ?? null,
        })
        .select('id')
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ mail }, { status: 201 });
}
