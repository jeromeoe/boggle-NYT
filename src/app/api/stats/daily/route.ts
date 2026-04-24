import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/server-client';
import { verifyToken, SESSION_COOKIE } from '@/lib/auth/jwt';
import { computeMedal } from '@/lib/boggle/medals';

const schema = z.object({
    netScore:        z.number().int(),
    grossScore:      z.number().int(),
    foundWords:      z.array(z.string()),
    allPossibleWords: z.array(z.string()),
    challengeDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD UTC
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

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { netScore, grossScore, foundWords, allPossibleWords, challengeDate } = parsed.data;
    const supabase = getSupabaseAdmin();

    // Only save stats for verified users
    const { data: user } = await supabase
        .from('users')
        .select('id, email_verified_at')
        .eq('id', payload.sub)
        .single();

    if (!user || !user.email_verified_at) {
        return NextResponse.json({ error: 'Email verification required to save stats.', requiresVerification: true }, { status: 403 });
    }

    const medal = computeMedal(foundWords, new Set(allPossibleWords), netScore);

    // Load existing stats
    const { data: existing } = await supabase
        .from('user_daily_stats')
        .select('*')
        .eq('user_id', payload.sub)
        .single();

    const today = challengeDate;
    const yesterday = getPreviousDate(today);

    // Streak logic
    let currentStreak = existing?.current_streak ?? 0;
    let bestStreak = existing?.best_streak ?? 0;
    let freezeAvailable = existing?.streak_freeze_available ?? 0;
    const lastDate = existing?.last_daily_date ?? null;

    if (lastDate === today) {
        // Already played today — don't update streak, don't double-count
        return NextResponse.json({ medal, alreadyCounted: true });
    }

    if (lastDate === yesterday) {
        // Consecutive day
        currentStreak += 1;
    } else if (lastDate === getPreviousDate(yesterday) && freezeAvailable > 0) {
        // Missed one day but has a freeze — auto-consume it
        currentStreak += 1;
        freezeAvailable = 0;
    } else {
        // Streak broken
        currentStreak = 1;
    }

    bestStreak = Math.max(bestStreak, currentStreak);

    // Award a streak freeze at every 7-day milestone (only once per milestone)
    const prevStreak = existing?.current_streak ?? 0;
    const crossedMilestone = Math.floor(currentStreak / 7) > Math.floor(prevStreak / 7);
    if (crossedMilestone) {
        freezeAvailable = Math.min(freezeAvailable + 1, 1); // cap at 1
    }

    // Tally medals
    const medalCounts = {
        platinum_medals:     (existing?.platinum_medals ?? 0) + (medal.tier === 'platinum' ? 1 : 0),
        gold_medals:         (existing?.gold_medals ?? 0) + (medal.tier === 'gold' ? 1 : 0),
        silver_medals:       (existing?.silver_medals ?? 0) + (medal.tier === 'silver' ? 1 : 0),
        bronze_medals:       (existing?.bronze_medals ?? 0) + (medal.tier === 'bronze' ? 1 : 0),
        participation_medals:(existing?.participation_medals ?? 0) + (medal.tier === 'participation' ? 1 : 0),
    };

    const upsertData = {
        user_id: payload.sub,
        current_streak: currentStreak,
        best_streak: bestStreak,
        last_daily_date: today,
        streak_freeze_available: freezeAvailable,
        games_played: (existing?.games_played ?? 0) + 1,
        best_net_score: Math.max(existing?.best_net_score ?? 0, netScore),
        best_gross_score: Math.max(existing?.best_gross_score ?? 0, grossScore),
        updated_at: new Date().toISOString(),
        ...medalCounts,
    };

    await supabase
        .from('user_daily_stats')
        .upsert(upsertData, { onConflict: 'user_id' });

    return NextResponse.json({
        medal,
        currentStreak,
        bestStreak,
        streakFreezeAvailable: freezeAvailable,
        freezeAwarded: crossedMilestone,
    });
}

function getPreviousDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
}
