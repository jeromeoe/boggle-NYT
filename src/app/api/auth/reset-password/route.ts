import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';

const schema = z.object({
    token: z.string().min(1),
    newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { token, newPassword } = parsed.data;
    const supabaseAdmin = getSupabaseAdmin();
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const { data: record } = await supabaseAdmin
        .from('password_reset_tokens')
        .select('id, user_id, expires_at, used')
        .eq('token_hash', tokenHash)
        .single();

    if (!record || record.used || new Date(record.expires_at) < new Date()) {
        return NextResponse.json(
            { error: 'This reset link is invalid or has expired. Please request a new one.' },
            { status: 400 }
        );
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    // Update password and mark token used in parallel
    await Promise.all([
        supabaseAdmin.from('users').update({ password_hash: newHash }).eq('id', record.user_id),
        supabaseAdmin.from('password_reset_tokens').update({ used: true }).eq('id', record.id),
    ]);

    return NextResponse.json({ message: 'Password reset successfully.' });
}
