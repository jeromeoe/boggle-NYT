import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';

const schema = z.object({ token: z.string().min(1) });

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid token.' }, { status: 400 });
    }

    const { token } = parsed.data;
    const supabase = getSupabaseAdmin();

    const { data: user } = await supabase
        .from('users')
        .select('id, email_verified_at, email_verification_token, email_verification_expires')
        .eq('email_verification_token', token)
        .single();

    if (!user) {
        return NextResponse.json({ error: 'Invalid or expired verification link.' }, { status: 400 });
    }

    if (user.email_verified_at) {
        return NextResponse.json({ message: 'Email already verified.' });
    }

    if (!user.email_verification_expires || new Date(user.email_verification_expires) < new Date()) {
        return NextResponse.json({ error: 'Verification link has expired. Please request a new one.' }, { status: 400 });
    }

    await supabase
        .from('users')
        .update({
            email_verified_at: new Date().toISOString(),
            email_verification_token: null,
            email_verification_expires: null,
        })
        .eq('id', user.id);

    return NextResponse.json({ message: 'Email verified successfully.' });
}
