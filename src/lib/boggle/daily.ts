import { generateBoardWithSeed } from './dice';

/**
 * Get today's daily challenge board
 * Uses a simple, fast date-based seed selection
 */
export async function getTodaysDailyBoard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to midnight

    // Create date-based seed (YYYYMMDD format)
    const dateStr = today.toISOString().split('T')[0]; // "2026-02-09"
    const baseSeed = parseInt(dateStr.replace(/-/g, '')); // 20260209

    // Use day of week to add variety (0-6)
    const dayOffset = today.getDay() * 7; // Spreads seeds across week

    // Final seed for today
    const seed = baseSeed + dayOffset;

    // Generate board with today's seed
    const board = generateBoardWithSeed(seed);

    return {
        board,
        seed,
        date: dateStr
    };
}
