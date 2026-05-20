import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { getSessionUser } from '@/lib/auth/session';

// POST /api/mail/[id]/play — record recipient's play result
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

    const { gross = 0, penalty = 0, net = 0, words = [], penalty_words = [] } = body;

    const db = getSupabaseAdmin();

    // Fetch the mail
    const { data: mail, error: fetchError } = await db
        .from('moggle_mail')
        .select('id, sender_id, recipient_id, recipient_played_at')
        .eq('id', id)
        .single();

    if (fetchError || !mail) return NextResponse.json({ error: 'Mail not found' }, { status: 404 });
    if (mail.recipient_id !== user.id) return NextResponse.json({ error: 'Not your mail' }, { status: 403 });
    if (mail.recipient_played_at) return NextResponse.json({ error: 'Already played' }, { status: 409 });

    const { data: updated, error: updateError } = await db
        .from('moggle_mail')
        .update({
            recipient_gross: gross,
            recipient_penalty: penalty,
            recipient_net: net,
            recipient_words: words,
            recipient_penalty_words: penalty_words,
            recipient_played_at: new Date().toISOString(),
        })
        .eq('id', id)
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
        .single();

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    return NextResponse.json({ mail: updated });
}
