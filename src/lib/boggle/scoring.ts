/**
 * Calculate score for a valid word
 * Scoring: 3-4L=1, 5L=2, 6L=3, 7L=5, 8L=7, 9+L=11
 */
export function calculateScore(word: string): number {
    const length = word.length;

    if (length < 3) return 0;
    if (length <= 4) return 1;
    if (length === 5) return 2;
    if (length === 6) return 3;
    if (length === 7) return 5;
    if (length === 8) return 7;
    return 11; // 9+ letters
}

/**
 * Calculate penalty for an invalid word
 * Penalty: every invalid word costs 1 point.
 */
export function calculatePenalty(word: string): number {
    void word;
    return -1;
}

/**
 * Calculate total score from found words and penalties
 */
export function calculateTotalScore(
    foundWords: string[],
    penalizedWords: string[]
): { gross: number; penalty: number; net: number } {
    const gross = foundWords.reduce((sum, word) => sum + calculateScore(word), 0);
    const penalty = penalizedWords.reduce((sum, word) => sum + calculatePenalty(word), 0);

    return {
        gross,
        penalty,
        net: gross + penalty
    };
}
