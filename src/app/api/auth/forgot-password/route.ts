import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash, randomBytes } from 'crypto';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';

const schema = z.object({ username: z.string().min(1) });

// Always return this — prevents username/email enumeration
const GENERIC_MSG = 'If that account has an email address on file, a reset link has been sent.';

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ message: GENERIC_MSG });
    }

    const { username } = parsed.data;

    const supabaseAdmin = getSupabaseAdmin();
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('username', username.toLowerCase())
        .single();

    // Silent exit — no email on file or user not found
    if (!user?.email) {
        return NextResponse.json({ message: GENERIC_MSG });
    }

    // Invalidate any existing unused tokens for this user
    await supabaseAdmin
        .from('password_reset_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('used', false);

    // Plaintext token sent in the email; only its SHA-256 hash stored in DB
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    await supabaseAdmin.from('password_reset_tokens').insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}`;

    await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'Boggle.WEB <noreply@example.com>',
        to: user.email,
        subject: 'Reset your Boggle.WEB password',
        html: `
            <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;padding:32px;background:#F9F7F1;border-radius:12px;border:1px solid #E6E4DD;">
                <div style="font-size:20px;font-weight:bold;color:#1A3C34;letter-spacing:-0.5px;margin-bottom:24px;">
                    BOGGLE<span style="color:#D4AF37;">.WEB</span>
                </div>
                <h1 style="color:#1A3C34;font-size:22px;margin:0 0 12px;">Password Reset Request</h1>
                <p style="color:#555;line-height:1.7;margin:0 0 8px;">
                    We received a request to reset the password for <strong>@${username}</strong>.
                </p>
                <p style="color:#555;line-height:1.7;margin:0 0 24px;">
                    Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
                </p>
                <a href="${resetUrl}"
                   style="display:inline-block;padding:14px 28px;background:#1A3C34;color:#F9F7F1;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;">
                    Reset Password
                </a>
                <p style="color:#999;font-size:13px;margin-top:32px;line-height:1.6;">
                    If you did not request this reset, you can safely ignore this email.<br/>
                    Your password will not be changed until you click the link above.
                </p>
                <hr style="border:none;border-top:1px solid #E6E4DD;margin:28px 0 16px;" />
                <p style="color:#CCC;font-size:11px;margin:0;">
                    BOGGLE<span style="color:#D4AF37;">.WEB</span> &mdash; Word Game
                </p>
            </div>
        `,
    });

    return NextResponse.json({ message: GENERIC_MSG });
}
