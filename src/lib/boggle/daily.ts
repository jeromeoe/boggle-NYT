import { generateBoardWithSeed } from './dice';

/**
 * Get today's daily challenge board
 * Uses a simple, fast date-based seed selection
 */
export async function getTodaysDailyBoard() {
    // Use UTC date so board seed matches the leaderboard's UTC date boundary
    const dateStr = new Date().toISOString().split('T')[0]; // "2026-02-09" (UTC)
    const baseSeed = parseInt(dateStr.replace(/-/g, '')); // 20260209

    // Use UTC day of week to add variety (0-6)
    const dayOffset = new Date().getUTCDay() * 7; // Spreads seeds across week

    // Final seed for today
    const seed = baseSeed + dayOffset;

    // Generate board with today's seed
    const board = generateBoardWithSeed(seed);

    return {
        board,
        seed,
        date: dateStr // UTC date string, consistent with leaderboard queries
    };
}
