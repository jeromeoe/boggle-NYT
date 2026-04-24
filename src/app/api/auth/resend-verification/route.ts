import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { verifyToken, SESSION_COOKIE } from '@/lib/auth/jwt';

// Rate limit: one resend per 2 minutes
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

const schema = z.object({
    email: z.string().email().optional(),
});

export async function POST(req: NextRequest) {
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

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    const submittedEmail = parsed.success ? parsed.data.email?.toLowerCase() : undefined;

    const supabase = getSupabaseAdmin();
    const { data: user } = await supabase
        .from('users')
        .select('id, email, email_verified_at, email_verification_expires, username')
        .eq('id', payload.sub)
        .single();

    if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // If user has no email, they must supply one now
    if (!user.email) {
        if (!submittedEmail) {
            return NextResponse.json({ error: 'No email on file. Please provide an email address.', needsEmail: true }, { status: 400 });
        }
        // Check uniqueness before saving
        const { data: taken } = await supabase
            .from('users')
            .select('id')
            .eq('email', submittedEmail)
            .single();
        if (taken) {
            return NextResponse.json({ error: 'That email is already associated with another account.' }, { status: 409 });
        }
        // Save the email
        await supabase.from('users').update({ email: submittedEmail }).eq('id', user.id);
        user.email = submittedEmail;
    }

    if (user.email_verified_at) {
        return NextResponse.json({ message: 'Email is already verified.' });
    }

    // Enforce cooldown — if existing token was issued recently, block resend
    if (user.email_verification_expires) {
        const expiresAt = new Date(user.email_verification_expires).getTime();
        const issuedAt = expiresAt - 24 * 60 * 60 * 1000; // token lifetime is 24h
        if (Date.now() - issuedAt < RESEND_COOLDOWN_MS) {
            return NextResponse.json({ error: 'Please wait a moment before requesting another email.' }, { status: 429 });
        }
    }

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await supabase
        .from('users')
        .update({ email_verification_token: token, email_verification_expires: expires })
        .eq('id', user.id);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://boggle-nyt.vercel.app';
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'Boggle.WEB <onboarding@resend.dev>',
        to: user.email,
        subject: 'Verify your Boggle.WEB email',
        html: buildVerificationEmail(user.username, verifyUrl),
    });

    return NextResponse.json({ message: 'Verification email sent.' });
}

function buildVerificationEmail(username: string, verifyUrl: string): string {
    return `
        <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;padding:32px;background:#F9F7F1;border-radius:12px;border:1px solid #E6E4DD;">
            <div style="font-size:20px;font-weight:bold;color:#1A3C34;letter-spacing:-0.5px;margin-bottom:24px;">
                BOGGLE<span style="color:#D4AF37;">.WEB</span>
            </div>
            <h1 style="color:#1A3C34;font-size:22px;margin:0 0 12px;">Verify your email</h1>
            <p style="color:#555;line-height:1.7;margin:0 0 8px;">
                Hi <strong>@${username}</strong> — almost there!
            </p>
            <p style="color:#555;line-height:1.7;margin:0 0 24px;">
                Click below to verify your email and unlock <strong>Daily Stats</strong> — including streaks, medals, and your personal best scores.
                This link expires in <strong>24 hours</strong>.
            </p>
            <a href="${verifyUrl}"
               style="display:inline-block;padding:14px 28px;background:#1A3C34;color:#F9F7F1;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;">
                Verify Email
            </a>
            <p style="color:#999;font-size:13px;margin-top:32px;line-height:1.6;">
                If you did not create a Boggle.WEB account, you can safely ignore this email.
            </p>
            <hr style="border:none;border-top:1px solid #E6E4DD;margin:28px 0 16px;" />
            <p style="color:#CCC;font-size:11px;margin:0;">
                BOGGLE<span style="color:#D4AF37;">.WEB</span> &mdash; Competitive Word Game
            </p>
        </div>
    `;
}
