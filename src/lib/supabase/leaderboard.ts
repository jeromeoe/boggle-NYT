import { supabase } from './client';
import type { LeaderboardEntry } from './client';

// All daily boundaries reset at Singapore midnight (UTC+8)
function getSingaporeDate(): string {
    return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
}

/**
 * Submit a game result to the database
 */
export async function submitGameResult(
    userId: string,
    gameData: {
        grossScore: number;
        penaltyScore: number;
        netScore: number;
        wordsFound: string[];
        wordsPenalized: string[];
        totalPossibleWords: number;
        durationSeconds: number;
        boardState: string[][];
        isDailyChallenge: boolean;
    }
) {
    try {
        const res = await fetch('/api/game/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gameData),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(err.error);
        }
        return { data: await res.json(), error: null };
    } catch (error: unknown) {
        return { data: null, error: (error as Error).message };
    }
}

/**
 * Check if user has already played today's daily challenge
 */
export async function hasPlayedDailyToday(userId: string): Promise<boolean> {
    try {
        const today = getSingaporeDate();

        const { count, error } = await supabase
            .from('game_stats')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('game_date', today)
            .eq('is_daily_challenge', true);

        if (error) throw error;
        return (count || 0) > 0;
    } catch (error) {
        console.error('Error checking played status:', error);
        return false;
    }
}

/**
 * Get leaderboard for a specific date (YYYY-MM-DD in Singapore time)
 */
export async function getLeaderboardForDate(date: string, limit: number = 50): Promise<LeaderboardEntry[]> {
    try {
        const { data, error } = await supabase
            .from('daily_leaderboard')
            .select(`*, users!inner(username, display_name)`)
            .eq('challenge_date', date)
            .order('net_score', { ascending: false })
            .order('completion_time_seconds', { ascending: true })
            .limit(limit);

        if (error) throw error;

        return (data || []).map((entry: any, index: number) => ({
            ...entry,
            rank: index + 1,
            username: entry.users.username,
            display_name: entry.users.display_name,
        }));
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
    }
}

/**
 * Get today's daily challenge leaderboard
 */
export async function getTodaysLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
    return getLeaderboardForDate(getSingaporeDate(), limit);
}

/**
 * Get user's rank for a given date's leaderboard
 */
export async function getUserRankForDate(userId: string, date: string): Promise<number | null> {
    try {
        const entries = await getLeaderboardForDate(date);
        const idx = entries.findIndex(e => e.user_id === userId);
        return idx === -1 ? null : idx + 1;
    } catch {
        return null;
    }
}

export async function getUserRankToday(userId: string): Promise<number | null> {
    return getUserRankForDate(userId, getSingaporeDate());
}

/** Returns the last N Singapore-date strings including today, newest first */
export function getRecentDates(days: number): string[] {
    return Array.from({ length: days }, (_, i) => {
        const d = new Date(Date.now() + 8 * 60 * 60 * 1000 - i * 86_400_000);
        return d.toISOString().split('T')[0];
    });
}

/**
 * Get all-time top players
 */
export async function getAllTimeLeaderboard(limit: number = 50): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('game_stats')
            .select(`
        user_id,
        users!inner(username, display_name)
      `)
            .eq('is_daily_challenge', true)
            .order('net_score', { ascending: false })
            .limit(limit);

        if (error) throw error;

        // Group by user and calculate stats
        const userStats = new Map();

        (data || []).forEach((game: any) => {
            const userId = game.user_id;
            if (!userStats.has(userId)) {
                userStats.set(userId, {
                    user_id: userId,
                    username: game.users.username,
                    display_name: game.users.display_name,
                    total_games: 0,
                    best_score: 0,
                    avg_score: 0,
                    total_score: 0,
                });
            }

            const stats = userStats.get(userId);
            stats.total_games += 1;
            stats.total_score += game.net_score;
            stats.best_score = Math.max(stats.best_score, game.net_score);
        });

        // Calculate averages and sort
        const leaderboard = Array.from(userStats.values()).map(stats => ({
            ...stats,
            avg_score: Math.round(stats.total_score / stats.total_games),
        }));

        leaderboard.sort((a, b) => b.avg_score - a.avg_score);

        return leaderboard.slice(0, limit);
    } catch (error) {
        console.error('Error fetching all-time leaderboard:', error);
        return [];
    }
}
