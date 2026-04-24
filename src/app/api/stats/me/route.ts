import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { verifyToken, SESSION_COOKIE } from '@/lib/auth/jwt';

export async function GET(req: NextRequest) {
    const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
    if (!sessionToken) {
        return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    let payload: { sub: string } | null = null;
    try {
        payload = await verifyToken(sessionToken) as { sub: string };
    } catch {
        return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    const [{ data: user }, { data: stats }] = await Promise.all([
        supabase
            .from('users')
            .select('id, email, email_verified_at')
            .eq('id', payload.sub)
            .single(),
        supabase
            .from('user_daily_stats')
            .select('*')
            .eq('user_id', payload.sub)
            .single(),
    ]);

    if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({
        emailVerified: !!user.email_verified_at,
        email: user.email,
        stats: stats ?? null,
    });
}
