import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';

// Called by Vercel cron (vercel.json) every hour.
// Also called fire-and-forget from /api/multiplayer/create.
export async function POST() {
    const supabase = getSupabaseAdmin();
    await supabase.rpc('cleanup_abandoned_rooms');
    return NextResponse.json({ ok: true });
}

// Vercel cron hits GET by default
export async function GET() {
    return POST();
}
