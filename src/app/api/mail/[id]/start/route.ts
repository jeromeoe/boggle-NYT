import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { getSessionUser } from '@/lib/auth/session';

// POST /api/mail/[id]/start — lock the game start time for the recipient
// Idempotent: returns existing started_at if already called.
// This prevents the refresh exploit: the timer is anchored to this server timestamp,
// so replaying the page only gives the player less time, never more.
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const db = getSupabaseAdmin();

    const { data: mail, error: fetchError } = await db
        .from('moggle_mail')
        .select('id, recipient_id, recipient_played_at, recipient_started_at, time_seconds')
        .eq('id', id)
        .single();

    if (fetchError || !mail) return NextResponse.json({ error: 'Mail not found' }, { status: 404 });
    if (mail.recipient_id !== user.id) return NextResponse.json({ error: 'Not your mail' }, { status: 403 });
    if (mail.recipient_played_at) return NextResponse.json({ error: 'Already played' }, { status: 409 });

    // Already started — return the existing timestamp (idempotent)
    if (mail.recipient_started_at) {
        const elapsed = Math.floor((Date.now() - new Date(mail.recipient_started_at).getTime()) / 1000);
        const timeLeft = Math.max(0, mail.time_seconds - elapsed);
        return NextResponse.json({ started_at: mail.recipient_started_at, time_left: timeLeft });
    }

    const started_at = new Date().toISOString();
    const { error: updateError } = await db
        .from('moggle_mail')
        .update({ recipient_started_at: started_at })
        .eq('id', id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    return NextResponse.json({ started_at, time_left: mail.time_seconds });
}
