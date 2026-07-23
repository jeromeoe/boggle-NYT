import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findAllWords } from '@/lib/boggle/solver';
import { computeMedal } from '@/lib/boggle/medals';
import { getServerDictionary } from '@/lib/boggle/server-dictionary';
import { shiftCalendarDate } from '@/lib/time/singapore';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { verifyToken, SESSION_COOKIE } from '@/lib/auth/jwt';

const schema = z.object({ gameId: z.string().uuid() });

function isBoard(value: unknown): value is string[][] {
    return Array.isArray(value)
        && value.length === 4
        && value.every(row => Array.isArray(row)
            && row.length === 4
            && row.every(tile => typeof tile === 'string'));
}

export async function POST(req: NextRequest) {
    const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
    if (!sessionToken) {
        return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    let payload: { sub: string };
    try {
        payload = await verifyToken(sessionToken) as { sub: string };
    } catch {
        return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
    }

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const [{ data: user }, { data: game }] = await Promise.all([
        supabase
            .from('users')
            .select('id, email_verified_at')
            .eq('id', payload.sub)
            .single(),
        supabase
            .from('game_stats')
            .select('id, user_id, game_date, net_score, gross_score, words_found, board_state, is_daily_challenge')
            .eq('id', parsed.data.gameId)
            .eq('user_id', payload.sub)
            .eq('is_daily_challenge', true)
            .single(),
    ]);

    if (!user || !user.email_verified_at) {
        return NextResponse.json(
            { error: 'Email verification required to save stats.', requiresVerification: true },
            { status: 403 },
        );
    }
    if (!game || !game.game_date || !isBoard(game.board_state)) {
        return NextResponse.json({ error: 'Verified daily game not found.' }, { status: 404 });
    }

    const { trie } = await getServerDictionary();
    const allPossibleWords = findAllWords(game.board_state, trie);
    const foundWords = Array.isArray(game.words_found) ? game.words_found : [];
    const netScore = game.net_score ?? 0;
    const grossScore = game.gross_score ?? 0;
    const challengeDate = game.game_date;
    const medal = computeMedal(foundWords, allPossibleWords, netScore);

    const { data: existing } = await supabase
        .from('user_daily_stats')
        .select('*')
        .eq('user_id', payload.sub)
        .single();

    const yesterday = shiftCalendarDate(challengeDate, -1);
    let currentStreak = existing?.current_streak ?? 0;
    let bestStreak = existing?.best_streak ?? 0;
    let freezeAvailable = existing?.streak_freeze_available ?? 0;
    const lastDate = existing?.last_daily_date ?? null;

    if (lastDate && lastDate >= challengeDate) {
        return NextResponse.json({ medal, alreadyCounted: true });
    }

    if (lastDate === yesterday) {
        currentStreak += 1;
    } else if (lastDate === shiftCalendarDate(yesterday, -1) && freezeAvailable > 0) {
        currentStreak += 1;
        freezeAvailable = 0;
    } else {
        currentStreak = 1;
    }

    bestStreak = Math.max(bestStreak, currentStreak);
    const prevStreak = existing?.current_streak ?? 0;
    const crossedMilestone = Math.floor(currentStreak / 7) > Math.floor(prevStreak / 7);
    if (crossedMilestone) freezeAvailable = Math.min(freezeAvailable + 1, 1);

    const medalCounts = {
        platinum_medals: (existing?.platinum_medals ?? 0) + (medal.tier === 'platinum' ? 1 : 0),
        gold_medals: (existing?.gold_medals ?? 0) + (medal.tier === 'gold' ? 1 : 0),
        silver_medals: (existing?.silver_medals ?? 0) + (medal.tier === 'silver' ? 1 : 0),
        bronze_medals: (existing?.bronze_medals ?? 0) + (medal.tier === 'bronze' ? 1 : 0),
        participation_medals: (existing?.participation_medals ?? 0) + (medal.tier === 'participation' ? 1 : 0),
    };

    const { error: statsError } = await supabase
        .from('user_daily_stats')
        .upsert({
            user_id: payload.sub,
            current_streak: currentStreak,
            best_streak: bestStreak,
            last_daily_date: challengeDate,
            streak_freeze_available: freezeAvailable,
            games_played: (existing?.games_played ?? 0) + 1,
            best_net_score: Math.max(existing?.best_net_score ?? 0, netScore),
            best_gross_score: Math.max(existing?.best_gross_score ?? 0, grossScore),
            updated_at: new Date().toISOString(),
            ...medalCounts,
        }, { onConflict: 'user_id' });

    if (statsError) {
        console.error('Failed to update daily stats:', statsError);
        return NextResponse.json({ error: 'Failed to update daily stats.' }, { status: 500 });
    }

    return NextResponse.json({
        medal,
        currentStreak,
        bestStreak,
        streakFreezeAvailable: freezeAvailable,
        freezeAwarded: crossedMilestone,
    });
}
