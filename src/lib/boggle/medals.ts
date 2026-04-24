import { calculateScore } from './scoring';

export type MedalTier = 'platinum' | 'gold' | 'silver' | 'bronze' | 'participation' | 'none';

export interface MedalResult {
    tier: MedalTier;
    score: number; // weighted coverage score 0–100
}

/**
 * Compute a weighted coverage score across word-length tiers.
 *
 * Key insight: open boards have many more short words than closed boards,
 * so finding short words on an open board is less impressive. We discount
 * the per-word value for a tier as the total count in that tier grows,
 * using a log2 dampening factor. This auto-scales: on a small closed
 * board where only 10 short words exist, each one matters more.
 *
 * Tier base weights (reflect point value + rarity):
 *   3–4 letters: 1.0   (easy, but scores 1pt each — floor contribution)
 *   5 letters:   2.5   (meaningful, 2pts each)
 *   6 letters:   4.0   (hard, 3pts each)
 *   7+ letters:  7.0   (rare, 5–8pts each — biggest differentiator)
 *
 * Effective weight = base / log2(tierCount + 2)
 * This means a tier with 100 words has its per-word value cut to ~14% of
 * base, while a tier with 5 words retains ~38% of base — a 2.7× difference.
 */
function tierWeight(base: number, tierCount: number): number {
    return base / Math.log2(tierCount + 2);
}

function groupByTier(words: string[]): { short: string[]; five: string[]; six: string[]; long: string[] } {
    const short: string[] = [];
    const five: string[] = [];
    const six: string[] = [];
    const long: string[] = [];
    for (const w of words) {
        const l = w.length;
        if (l <= 4) short.push(w);
        else if (l === 5) five.push(w);
        else if (l === 6) six.push(w);
        else long.push(w);
    }
    return { short, five, six, long };
}

export function computeMedal(
    foundWords: string[],
    allPossibleWords: Set<string>,
    netScore: number
): MedalResult {
    // Participation: played and scored at least 10 net points
    if (netScore < 10) {
        return { tier: 'none', score: 0 };
    }

    const allPossible = Array.from(allPossibleWords);
    const possible = groupByTier(allPossible);
    const found = groupByTier(foundWords);

    const tiers = [
        { base: 1.0, possibleCount: possible.short.length, foundCount: found.short.length },
        { base: 2.5, possibleCount: possible.five.length,  foundCount: found.five.length  },
        { base: 4.0, possibleCount: possible.six.length,   foundCount: found.six.length   },
        { base: 7.0, possibleCount: possible.long.length,  foundCount: found.long.length  },
    ];

    let weightedSum = 0;
    let maxWeightedSum = 0;

    for (const { base, possibleCount, foundCount } of tiers) {
        if (possibleCount === 0) continue;
        const w = tierWeight(base, possibleCount);
        weightedSum    += w * (foundCount / possibleCount);
        maxWeightedSum += w;
    }

    // Normalize to 0–100
    const coverageScore = maxWeightedSum > 0 ? (weightedSum / maxWeightedSum) * 100 : 0;

    // Thresholds calibrated so:
    //   Open board (350pt possible): Gold ≈ 65–80pt player, Platinum ≈ 120pt+
    //   Closed board (80pt possible): Gold ≈ 50pt+, Platinum ≈ 65pt+
    let tier: MedalTier;
    if (coverageScore >= 62) tier = 'platinum';
    else if (coverageScore >= 40) tier = 'gold';
    else if (coverageScore >= 24) tier = 'silver';
    else if (coverageScore >= 12) tier = 'bronze';
    else tier = 'participation';

    return { tier, score: Math.round(coverageScore * 10) / 10 };
}

export function medalLabel(tier: MedalTier): string {
    switch (tier) {
        case 'platinum':     return 'Platinum';
        case 'gold':         return 'Gold';
        case 'silver':       return 'Silver';
        case 'bronze':       return 'Bronze';
        case 'participation': return 'Participant';
        default:             return '';
    }
}

/** Points value for the scoring table (used at game-end for display only) */
export function medalPoints(tier: MedalTier): number {
    switch (tier) {
        case 'platinum':     return 5;
        case 'gold':         return 4;
        case 'silver':       return 3;
        case 'bronze':       return 2;
        case 'participation': return 1;
        default:             return 0;
    }
}

/** CSS color tokens for each medal tier */
export function medalColor(tier: MedalTier): { primary: string; secondary: string } {
    switch (tier) {
        case 'platinum':     return { primary: '#E8E8F0', secondary: '#9090B8' };
        case 'gold':         return { primary: '#D4AF37', secondary: '#A07820' };
        case 'silver':       return { primary: '#C0C0C0', secondary: '#808080' };
        case 'bronze':       return { primary: '#CD7F32', secondary: '#8B5A1A' };
        case 'participation': return { primary: 'rgba(200,200,200,0.4)', secondary: 'rgba(150,150,150,0.5)' };
        default:             return { primary: 'transparent', secondary: 'transparent' };
    }
}

/** Verify the formula against known benchmarks */
export function _debugMedal(label: string, foundWords: string[], allWords: string[], net: number) {
    const result = computeMedal(foundWords, new Set(allWords), net);
    const score = foundWords.reduce((s, w) => s + calculateScore(w), 0);
    console.debug(`[medal] ${label} | net=${net} gross=${score} coverage=${result.score} → ${result.tier}`);
}
