import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { getSessionUser } from '@/lib/auth/session';

function getSingaporeDate(): string {
    return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
}

const schema = z.object({
    grossScore: z.number(),
    penaltyScore: z.number(),
    netScore: z.number(),
    wordsFound: z.array(z.string()),
    wordsPenalized: z.array(z.string()),
    totalPossibleWords: z.number(),
    durationSeconds: z.number(),
    boardState: z.array(z.array(z.string())),
    isDailyChallenge: z.boolean(),
});

export async function POST(req: NextRequest) {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

    const db = getSupabaseAdmin();
    const today = getSingaporeDate();
    const d = parsed.data;

    const { data, error } = await db.from('game_stats').insert({
        user_id: user.id,
        game_date: today,
        gross_score: d.grossScore,
        penalty_score: d.penaltyScore,
        net_score: d.netScore,
        words_found: d.wordsFound,
        words_penalized: d.wordsPenalized,
        total_possible_words: d.totalPossibleWords,
        duration_seconds: d.durationSeconds,
        board_state: d.boardState,
        is_daily_challenge: d.isDailyChallenge,
    }).select().single();

    if (error) return NextResponse.json({ error: 'Failed to save game' }, { status: 500 });

    if (d.isDailyChallenge) {
        const { error: lbError } = await db.from('daily_leaderboard').upsert(
            {
                user_id: user.id,
                challenge_date: today,
                gross_score: d.grossScore,
                net_score: d.netScore,
                words_found: d.wordsFound.length,
                completion_time_seconds: d.durationSeconds,
                rank: 0,
            },
            { onConflict: 'user_id,challenge_date' }
        );
        if (lbError) console.error('Failed to write leaderboard entry:', lbError);
    }

    return NextResponse.json({ ok: true, id: data.id });
}
