import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server-client";
import { getTodaysDailyBoard } from "@/lib/boggle/daily";
import { findAllWords } from "@/lib/boggle/solver";
import { buildTrie } from "@/lib/boggle/trie";
import { calculateScore, calculatePenalty } from "@/lib/boggle/scoring";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

/* -----------------------------------------------------------------------
   Bot profiles
   ----------------------------------------------------------------------- */

interface BotProfile {
    username: string;
    displayName: string;
    /** "average" = ~8-10% of max possible, "bad" = ~20 pts total */
    skill: "average" | "bad";
}

const BOTS: BotProfile[] = [
    { username: "cuddler", displayName: "TCuddler", skill: "bad" },
    { username: "xqc", displayName: "Is", skill: "bad" },
    { username: "weslers", displayName: "wesley", skill: "bad" },
    { username: "abcdef", displayName: "abcdef", skill: "average" },
];

const BOT_PASSWORD = "bot_internal_account_do_not_login";

/* -----------------------------------------------------------------------
   Helpers
   ----------------------------------------------------------------------- */

function getSingaporeDate(): string {
    return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split("T")[0];
}

/** Seeded RNG (Mulberry32) — deterministic per day + bot so results are
 *  stable if the cron fires twice. */
function seededRng(seed: number): () => number {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function shuffleWithRng<T>(arr: T[], rng: () => number): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/** Pick words for a bot and return { wordsFound, wordsPenalized }. */
function pickWords(
    allWords: string[],
    skill: "average" | "bad",
    targetNet: number,
    rng: () => number
): { wordsFound: string[]; wordsPenalized: string[] } {
    const shuffled = shuffleWithRng(allWords, rng);
    const consonants = "BCDFGHJKLMNPQRSTVWXYZ";

    const buildFakePenalty = (len: number) => {
        let fake = "";
        for (let c = 0; c < len; c++) fake += consonants[Math.floor(rng() * consonants.length)];
        return fake;
    };

    if (skill === "average") {
        // abcdef: hit targetNet with a small natural overshoot buffer, 0-1 penalty
        const doPenalize = rng() < 0.35;
        const targetGross = doPenalize ? targetNet + 2 : targetNet;
        const wordsFound: string[] = [];
        let gross = 0;

        for (const word of shuffled) {
            const s = calculateScore(word);
            if (gross + s <= targetGross + 1) {
                wordsFound.push(word);
                gross += s;
            }
            if (gross >= targetGross) break;
        }

        const penalized: string[] = [];
        if (doPenalize) penalized.push(buildFakePenalty(4));

        return { wordsFound, wordsPenalized: penalized };
    }

    // bad bots: raw ~30-40, net ~20-26 after heavy penalties
    const targetGross = 30 + Math.floor(rng() * 11); // 30-40
    const wordsFound: string[] = [];
    let gross = 0;

    for (const word of shuffled) {
        const s = calculateScore(word);
        if (gross + s <= targetGross + 2) {
            wordsFound.push(word);
            gross += s;
        }
        if (gross >= targetGross) break;
    }

    // Heavy penalty load — 3-6 fake attempts to reflect high error rate
    const penaltyCount = 3 + Math.floor(rng() * 4);
    const penalized: string[] = [];
    for (let i = 0; i < penaltyCount; i++) penalized.push(buildFakePenalty(3 + Math.floor(rng() * 3)));

    return { wordsFound, wordsPenalized: penalized };
}

/* -----------------------------------------------------------------------
   Route handler
   ----------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
    // Verify this is called by Vercel Cron (or manual trigger with secret)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const today = getSingaporeDate();

    /* ---------- 1. Ensure bot accounts exist ---------- */
    const passwordHash = await bcrypt.hash(BOT_PASSWORD, 10);
    const botUserIds: Record<string, string> = {};

    for (const bot of BOTS) {
        // Try to find existing account
        const { data: existing } = await supabase
            .from("users")
            .select("id")
            .eq("username", bot.username)
            .single();

        if (existing) {
            botUserIds[bot.username] = existing.id;
            continue;
        }

        // Create new account
        const { data: created, error } = await supabase
            .from("users")
            .insert({
                username: bot.username,
                display_name: bot.displayName,
                password_hash: passwordHash,
            })
            .select("id")
            .single();

        if (error) {
            console.error(`Failed to create bot ${bot.username}:`, error);
            continue;
        }
        botUserIds[bot.username] = created.id;
    }

    /* ---------- 2. Load dictionary + solve today's board ---------- */
    const dictPath = path.join(process.cwd(), "public", "data", "csw24-words.json");
    const wordList: string[] = JSON.parse(fs.readFileSync(dictPath, "utf-8"));
    const trie = buildTrie(wordList);

    const { board, seed } = await getTodaysDailyBoard();
    const allPossibleWords = findAllWords(board, trie);
    const allWordsSorted = [...allPossibleWords].sort(
        (a, b) => calculateScore(b) - calculateScore(a)
    );

    /* ---------- 3. Check current top score ---------- */
    const { data: topEntry } = await supabase
        .from("daily_leaderboard")
        .select("net_score")
        .eq("challenge_date", today)
        .order("net_score", { ascending: false })
        .limit(1)
        .single();

    const currentTopScore = topEntry?.net_score ?? 0;
    const maxPossibleScore = allWordsSorted.reduce((s, w) => s + calculateScore(w), 0);
    // abcdef aims for ~10% of max possible, ±1% variance per day
    const abcdefRng = seededRng(dateSeed + 7777);
    const abcdefTarget = Math.max(
        Math.floor(maxPossibleScore * (0.10 + abcdefRng() * 0.05)),
        12
    );

    /* ---------- 4. Decide which bots play today ---------- */
    const results: { username: string; net: number; status: string }[] = [];
    const dateSeed = parseInt(today.replace(/-/g, ""));

    // Each bot has a ~60% chance of playing on any given day, decided
    // deterministically via a day-seeded RNG so re-runs are stable.
    // Guarantee at least one bot plays so the board is never empty.
    const participationRng = seededRng(dateSeed + 9999);
    let todaysBots = BOTS.filter(() => participationRng() < 0.6);
    if (todaysBots.length === 0) {
        // Pick one at random (deterministic)
        todaysBots = [BOTS[Math.floor(participationRng() * BOTS.length)]];
    }

    for (const bot of todaysBots) {
        const userId = botUserIds[bot.username];
        if (!userId) {
            results.push({ username: bot.username, net: 0, status: "no_account" });
            continue;
        }

        // Skip if already played today (idempotent)
        const { count } = await supabase
            .from("game_stats")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("game_date", today)
            .eq("is_daily_challenge", true);

        if ((count ?? 0) > 0) {
            results.push({ username: bot.username, net: 0, status: "already_played" });
            continue;
        }

        // Deterministic seed per bot + day
        const botSeed = dateSeed + bot.username.charCodeAt(0) * 1000 + seed;
        const rng = seededRng(botSeed);

        const target = bot.skill === "average" ? abcdefTarget : 0;
        const { wordsFound, wordsPenalized } = pickWords(
            allWordsSorted,
            bot.skill,
            target,
            rng
        );

        const gross = wordsFound.reduce((s, w) => s + calculateScore(w), 0);
        const penalty = wordsPenalized.reduce((s, w) => s + calculatePenalty(w), 0);
        const net = gross + penalty;

        // Completion time
        const baseTime = bot.skill === "average"
            ? 180
            : 120 + Math.floor(rng() * 61); // 120-180s

        // Write game_stats
        await supabase.from("game_stats").insert({
            user_id: userId,
            game_date: today,
            gross_score: gross,
            penalty_score: penalty,
            net_score: net,
            words_found: wordsFound,
            words_penalized: wordsPenalized,
            total_possible_words: allPossibleWords.size,
            duration_seconds: baseTime,
            board_state: board,
            is_daily_challenge: true,
        });

        // Write daily_leaderboard
        await supabase.from("daily_leaderboard").upsert(
            {
                user_id: userId,
                challenge_date: today,
                gross_score: gross,
                net_score: net,
                words_found: wordsFound.length,
                completion_time_seconds: baseTime,
                rank: 0,
            },
            { onConflict: "user_id,challenge_date" }
        );

        results.push({ username: bot.username, net, status: "submitted" });
    }

    // Report skipped bots
    const playingUsernames = new Set(todaysBots.map((b) => b.username));
    for (const bot of BOTS) {
        if (!playingUsernames.has(bot.username)) {
            results.push({ username: bot.username, net: 0, status: "skipped_today" });
        }
    }

    return NextResponse.json({ date: today, results });
}

/** GET handler — Vercel Cron sends GET requests by default. */
export async function GET(req: NextRequest) {
    return POST(req);
}
