import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { signToken, SESSION_COOKIE } from '@/lib/auth/jwt';

const schema = z.object({
    username: z.string().min(1).max(50),
    password: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { username, password } = parsed.data;

    const supabaseAdmin = getSupabaseAdmin();

    // Service role client — password_hash never leaves the server
    const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('id, username, email, display_name, password_hash')
        .eq('username', username.toLowerCase())
        .single();

    if (error || !user) {
        return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
        return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Fire-and-forget last login update
    supabaseAdmin.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id);

    const token = await signToken({
        sub: user.id,
        username: user.username,
        display_name: user.display_name ?? null,
    });

    // Return safe user data (no password_hash) and set httpOnly session cookie
    const { password_hash: _omit, ...safeUser } = user;
    const response = NextResponse.json({ user: safeUser });
    response.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
    });
    return response;
}
