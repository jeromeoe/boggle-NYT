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
        const today = getSingaporeDate();

        const { data, error } = await supabase
            .from('game_stats')
            .insert([
                {
                    user_id: userId,
                    game_date: today,
                    gross_score: gameData.grossScore,
                    penalty_score: gameData.penaltyScore,
                    net_score: gameData.netScore,
                    words_found: gameData.wordsFound,
                    words_penalized: gameData.wordsPenalized,
                    total_possible_words: gameData.totalPossibleWords,
                    duration_seconds: gameData.durationSeconds,
                    board_state: gameData.boardState,
                    is_daily_challenge: gameData.isDailyChallenge,
                },
            ])
            .select()
            .single();

        if (error) throw error;

        // Also write to daily_leaderboard so it appears on the leaderboard
        if (gameData.isDailyChallenge) {
            const { error: lbError } = await supabase
                .from('daily_leaderboard')
                .upsert(
                    {
                        user_id: userId,
                        challenge_date: today,
                        gross_score: gameData.grossScore,
                        net_score: gameData.netScore,
                        words_found: gameData.wordsFound.length,
                        completion_time_seconds: gameData.durationSeconds,
                        rank: 0,
                    },
                    { onConflict: 'user_id,challenge_date' }
                );

            if (lbError) console.error('Failed to write leaderboard entry:', lbError);
        }

        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
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
 * Get today's daily challenge leaderboard
 */
export async function getTodaysLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
    try {
        const today = getSingaporeDate();

        const { data, error } = await supabase
            .from('daily_leaderboard')
            .select(`
        *,
        users!inner(username, display_name)
      `)
            .eq('challenge_date', today)
            .order('net_score', { ascending: false })
            .order('completion_time_seconds', { ascending: true })
            .limit(limit);

        if (error) throw error;

        // Transform data to include username
        return (data || []).map((entry: any, index) => ({
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
 * Get user's rank for today's daily challenge
 */
export async function getUserRankToday(userId: string): Promise<number | null> {
    try {
        const entries = await getTodaysLeaderboard();
        const idx = entries.findIndex(e => e.user_id === userId);
        return idx === -1 ? null : idx + 1;
    } catch (error) {
        return null;
    }
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
