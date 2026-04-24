import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { signToken, SESSION_COOKIE } from '@/lib/auth/jwt';

const schema = z.object({
    username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username must be at most 30 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    email: z.string().email('Please enter a valid email address'),
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

    // Check email uniqueness before hashing password (cheaper early exit)
    const { data: existingEmail } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

    if (existingEmail) {
        return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Generate email verification token
    const verificationToken = randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: user, error } = await supabaseAdmin
        .from('users')
        .insert({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password_hash: passwordHash,
            display_name: displayName || username,
            email_verification_token: verificationToken,
            email_verification_expires: verificationExpires,
        })
        .select('id, username, email, display_name')
        .single();

    if (error) {
        if (error.code === '23505') {
            return NextResponse.json({ error: 'Username already taken.' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to create account.' }, { status: 500 });
    }

    // Seed rating, presence, and daily stats (fire-and-forget)
    supabaseAdmin.from('user_ratings').insert({ user_id: user.id, rating: 800, peak: 800, games: 0 });
    supabaseAdmin.from('friend_presence').insert({ user_id: user.id, last_seen_at: new Date().toISOString() });
    supabaseAdmin.from('user_daily_stats').insert({ user_id: user.id });

    // Send verification email (fire-and-forget — don't block signup on email delivery)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://boggle-nyt.vercel.app';
    const verifyUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
    const resend = new Resend(process.env.RESEND_API_KEY);
    resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'Boggle.WEB <onboarding@resend.dev>',
        to: email,
        subject: 'Verify your Boggle.WEB email',
        html: buildVerificationEmail(username, verifyUrl),
    }).catch(() => {}); // never crash signup on email failure

    const token = await signToken({
        sub: user.id,
        username: user.username,
        display_name: user.display_name ?? null,
    });

    const response = NextResponse.json({ user, emailSent: true });
    response.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
    });
    return response;
}

function buildVerificationEmail(username: string, verifyUrl: string): string {
    return `
        <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;padding:32px;background:#F9F7F1;border-radius:12px;border:1px solid #E6E4DD;">
            <div style="font-size:20px;font-weight:bold;color:#1A3C34;letter-spacing:-0.5px;margin-bottom:24px;">
                BOGGLE<span style="color:#D4AF37;">.WEB</span>
            </div>
            <h1 style="color:#1A3C34;font-size:22px;margin:0 0 12px;">Welcome, @${username}!</h1>
            <p style="color:#555;line-height:1.7;margin:0 0 8px;">
                Your account is ready — one last step.
            </p>
            <p style="color:#555;line-height:1.7;margin:0 0 24px;">
                Verify your email to unlock <strong>Daily Stats</strong>: streaks with freeze protection,
                medal tracking, and your personal best scores. Link expires in <strong>24 hours</strong>.
            </p>
            <a href="${verifyUrl}"
               style="display:inline-block;padding:14px 28px;background:#1A3C34;color:#F9F7F1;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;">
                Verify Email
            </a>
            <p style="color:#999;font-size:13px;margin-top:32px;line-height:1.6;">
                You can still play without verifying — daily stats just won't be saved until you do.
            </p>
            <hr style="border:none;border-top:1px solid #E6E4DD;margin:28px 0 16px;" />
            <p style="color:#CCC;font-size:11px;margin:0;">
                BOGGLE<span style="color:#D4AF37;">.WEB</span> &mdash; Competitive Word Game
            </p>
        </div>
    `;
}
