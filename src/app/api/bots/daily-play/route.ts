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
    /** Fraction of max possible score to target (e.g. 0.10 = 10%) */
    targetFraction: number;
    /** true = only picks 3-4 letter words so word count ≈ point total */
    preferShort: boolean;
}

const BOTS: BotProfile[] = [
    { username: "cuddler", displayName: "TCuddler", targetFraction: 0.10, preferShort: true },
    { username: "xqc", displayName: "Is", targetFraction: 0.10, preferShort: true },
    { username: "weslers", displayName: "wesley", targetFraction: 0.10, preferShort: true },
    { username: "abcdef", displayName: "abcdef", targetFraction: 0.15, preferShort: false },
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

/** Generate fake invalid-word strings that each carry a -1 penalty (3-4 chars). */
function buildPenaltyWords(count: number, rng: () => number): string[] {
    const consonants = "BCDFGHJKLMNPQRSTVWXYZ";
    return Array.from({ length: count }, () => {
        const len = 3 + Math.floor(rng() * 2); // 3 or 4 chars → -1 each
        return Array.from({ length: len }, () =>
            consonants[Math.floor(rng() * consonants.length)]
        ).join("");
    });
}

/**
 * Pick words for a bot deterministically.
 *
 * Penalties are resolved first so targetGross = targetNet + penaltyCount,
 * guaranteeing net = gross + penaltyTotal = targetNet exactly (no impossible results).
 *
 * preferShort=true  → only 3-4 letter words (1 pt each), so words_found ≈ net score.
 * preferShort=false → full word pool, mixed lengths.
 */
function pickWords(
    allWords: string[],
    targetNet: number,
    preferShort: boolean,
    rng: () => number
): { wordsFound: string[]; wordsPenalized: string[] } {
    // Resolve penalties first
    const maxPenalties = preferShort ? 8 : 2;
    const penaltyCount = Math.floor(rng() * (maxPenalties + 1));
    const wordsPenalized = buildPenaltyWords(penaltyCount, rng);
    const penaltyTotal = wordsPenalized.reduce((s, w) => s + calculatePenalty(w), 0);

    // targetGross accounts for the penalty hole — net will equal targetNet exactly
    const targetGross = targetNet - penaltyTotal; // penaltyTotal ≤ 0, so this ≥ targetNet

    // Build candidate pool
    const pool = preferShort
        ? allWords.filter(w => w.length <= 4)   // 1 pt each → words_found ≈ gross ≈ net
        : allWords;
    const candidates = shuffleWithRng(pool, rng);

    // Greedily fill up to targetGross
    const wordsFound: string[] = [];
    let gross = 0;
    for (const word of candidates) {
        const s = calculateScore(word);
        if (gross + s <= targetGross) {
            wordsFound.push(word);
            gross += s;
        }
        if (gross >= targetGross) break;
    }

    return { wordsFound, wordsPenalized };
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

    const dateSeed = parseInt(today.replace(/-/g, ""));
    const maxPossibleScore = allWordsSorted.reduce((s, w) => s + calculateScore(w), 0);

    /* ---------- 4. Decide which bots play today ---------- */
    const results: { username: string; net: number; status: string }[] = [];

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

        const target = Math.max(Math.floor(maxPossibleScore * bot.targetFraction), 12);
        const { wordsFound, wordsPenalized } = pickWords(allWordsSorted, target, bot.preferShort, rng);

        const gross = wordsFound.reduce((s, w) => s + calculateScore(w), 0);
        const penalty = wordsPenalized.reduce((s, w) => s + calculatePenalty(w), 0);
        const net = gross + penalty;

        const baseTime = 180;

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
