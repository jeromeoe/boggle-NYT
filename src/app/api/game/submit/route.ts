import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { getSessionUser } from '@/lib/auth/session';
import { getDailyBoardForDate } from '@/lib/boggle/daily';
import { findAllWords } from '@/lib/boggle/solver';
import { getServerDictionary } from '@/lib/boggle/server-dictionary';
import { canonicalizeSubmission, SubmissionValidationError } from '@/lib/boggle/submission';
import { isCurrentOrPreviousSingaporeDate } from '@/lib/time/singapore';

const wordSchema = z.string().min(3).max(32);
const schema = z.object({
    challengeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    wordsFound: z.array(wordSchema).max(512),
    wordsPenalized: z.array(wordSchema).max(512),
    durationSeconds: z.number().int().min(0).max(180),
    isDailyChallenge: z.literal(true),
});

export async function POST(req: NextRequest) {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

    const d = parsed.data;
    if (!isCurrentOrPreviousSingaporeDate(d.challengeDate)) {
        return NextResponse.json({ error: 'This Daily Challenge is no longer accepting scores' }, { status: 409 });
    }

    const db = getSupabaseAdmin();
    const { data: existing } = await db
        .from('game_stats')
        .select('id')
        .eq('user_id', user.id)
        .eq('game_date', d.challengeDate)
        .eq('is_daily_challenge', true)
        .limit(1)
        .maybeSingle();

    if (existing) {
        return NextResponse.json({ error: 'Daily Challenge already submitted' }, { status: 409 });
    }

    try {
        const { trie } = await getServerDictionary();
        const daily = getDailyBoardForDate(d.challengeDate);
        const allPossibleWords = findAllWords(daily.board, trie);
        const canonical = canonicalizeSubmission(allPossibleWords, d.wordsFound, d.wordsPenalized);
        const leaderboardDuration = canonical.isComplete ? d.durationSeconds : 180;

        const { data: game, error: gameError } = await db.from('game_stats').insert({
            user_id: user.id,
            game_date: d.challengeDate,
            gross_score: canonical.grossScore,
            penalty_score: canonical.penaltyScore,
            net_score: canonical.netScore,
            words_found: canonical.wordsFound,
            words_penalized: canonical.wordsPenalized,
            total_possible_words: allPossibleWords.size,
            duration_seconds: d.durationSeconds,
            board_state: daily.board,
            is_daily_challenge: true,
        }).select().single();

        if (gameError || !game) {
            console.error('Failed to save verified game stats:', gameError);
            return NextResponse.json({ error: 'Failed to save game' }, { status: 500 });
        }

        const { error: leaderboardError } = await db.from('daily_leaderboard').upsert(
            {
                user_id: user.id,
                challenge_date: d.challengeDate,
                gross_score: canonical.grossScore,
                net_score: canonical.netScore,
                words_found: canonical.wordsFound.length,
                completion_time_seconds: leaderboardDuration,
                rank: 0,
            },
            { onConflict: 'user_id,challenge_date' },
        );

        if (leaderboardError) {
            console.error('Failed to write verified leaderboard entry:', leaderboardError);
            await db.from('game_stats').delete().eq('id', game.id);
            return NextResponse.json({ error: 'Failed to save leaderboard entry' }, { status: 500 });
        }

        return NextResponse.json({
            ok: true,
            id: game.id,
            challengeDate: d.challengeDate,
            grossScore: canonical.grossScore,
            penaltyScore: canonical.penaltyScore,
            netScore: canonical.netScore,
            totalPossibleWords: allPossibleWords.size,
        });
    } catch (error) {
        if (error instanceof SubmissionValidationError) {
            return NextResponse.json({ error: error.message }, { status: 422 });
        }
        console.error('Failed to validate Daily Challenge result:', error);
        return NextResponse.json({ error: 'Failed to validate game' }, { status: 500 });
    }
}
