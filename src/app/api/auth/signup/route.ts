import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { signToken, SESSION_COOKIE } from '@/lib/auth/jwt';

const schema = z.object({
    username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username must be at most 30 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    displayName: z.string().max(50).optional(),
});

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { username, password, email, displayName } = parsed.data;

    const supabaseAdmin = getSupabaseAdmin();
    const passwordHash = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabaseAdmin
        .from('users')
        .insert({
            username: username.toLowerCase(),
            email: email || null,
            password_hash: passwordHash,
            display_name: displayName || username,
        })
        .select('id, username, email, display_name')
        .single();

    if (error) {
        if (error.code === '23505') {
            return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    // Seed rating + presence for new user (fire-and-forget)
    supabaseAdmin.from('user_ratings').insert({ user_id: user.id, rating: 800, peak: 800, games: 0 });
    supabaseAdmin.from('friend_presence').insert({ user_id: user.id, last_seen_at: new Date().toISOString() });

    const token = await signToken({
        sub: user.id,
        username: user.username,
        display_name: user.display_name ?? null,
    });

    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
    });
    return response;
}
