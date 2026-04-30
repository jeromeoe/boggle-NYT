import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, SESSION_COOKIE } from '@/lib/auth/jwt';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';

const ADMIN_USERNAMES = ['jerome'];

export async function PATCH(req: NextRequest) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let caller: Awaited<ReturnType<typeof verifyToken>>;
    try {
        caller = await verifyToken(token);
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ADMIN_USERNAMES.includes(caller.username)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { username, tag } = await req.json();
    if (typeof username !== 'string' || username.trim() === '') {
        return NextResponse.json({ error: 'username is required' }, { status: 400 });
    }
    // tag = null or a non-empty string (max 20 chars)
    const sanitized: string | null =
        tag === null || tag === '' ? null : String(tag).slice(0, 20).trim() || null;

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
        .from('users')
        .update({ custom_tag: sanitized })
        .eq('username', username);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, username, tag: sanitized });
}
