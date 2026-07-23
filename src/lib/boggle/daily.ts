import { generateBoardWithSeed } from './dice';
import { getSingaporeDate } from '../time/singapore';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getDailyBoardForDate(dateStr: string) {
    if (!DATE_PATTERN.test(dateStr)) throw new Error('Daily Challenge date must be YYYY-MM-DD');

    const baseSeed = Number.parseInt(dateStr.replace(/-/g, ''), 10);
    const date = new Date(`${dateStr}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) throw new Error('Invalid Daily Challenge date');

    const dayOffset = date.getUTCDay() * 7;
    const seed = baseSeed + dayOffset;
    const board = generateBoardWithSeed(seed);

    return { board, seed, date: dateStr };
}

export async function getTodaysDailyBoard() {
    return getDailyBoardForDate(getSingaporeDate());
}
