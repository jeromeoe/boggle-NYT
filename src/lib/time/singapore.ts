const SINGAPORE_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Return the calendar date used by Daily Challenge (Singapore, UTC+8). */
export function getSingaporeDate(now: number | Date = Date.now()): string {
    const timestamp = now instanceof Date ? now.getTime() : now;
    return new Date(timestamp + SINGAPORE_OFFSET_MS).toISOString().slice(0, 10);
}

/** Shift a YYYY-MM-DD calendar date without involving the host timezone. */
export function shiftCalendarDate(date: string, days: number): string {
    const parsed = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) throw new Error('Invalid calendar date');
    parsed.setUTCDate(parsed.getUTCDate() + days);
    return parsed.toISOString().slice(0, 10);
}

export function isCurrentOrPreviousSingaporeDate(date: string, now: number | Date = Date.now()): boolean {
    const today = getSingaporeDate(now);
    return date === today || date === shiftCalendarDate(today, -1);
}
