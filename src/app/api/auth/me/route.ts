import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, SESSION_COOKIE } from '@/lib/auth/jwt';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';

export async function GET(req: NextRequest) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ user: null });

    try {
        const payload = await verifyToken(token);
        const supabaseAdmin = getSupabaseAdmin();

        const { data: user } = await supabaseAdmin
            .from('users')
            .select('id, username, display_name, email')
            .eq('id', payload.sub)
            .single();

        return NextResponse.json({ user: user ?? null });
    } catch {
        // Invalid or expired token
        return NextResponse.json({ user: null });
    }
}
