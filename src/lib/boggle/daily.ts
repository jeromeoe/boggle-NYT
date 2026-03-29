import { generateBoardWithSeed } from './dice';

// Singapore is UTC+8. All daily boundaries reset at Singapore midnight.
function getSingaporeDate(): string {
    return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
}

export async function getTodaysDailyBoard() {
    const dateStr = getSingaporeDate(); // e.g. "2026-03-30" in Singapore time
    const baseSeed = parseInt(dateStr.replace(/-/g, ''));

    // Add day-of-week variety using Singapore date
    const sgDate = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const dayOffset = sgDate.getUTCDay() * 7;

    const seed = baseSeed + dayOffset;
    const board = generateBoardWithSeed(seed);

    return { board, seed, date: dateStr };
}
