import { calculateScore } from './scoring';

export interface CoreChain {
    core: string;
    words: string[];
    totalScore: number;
}

export interface AnagramSet {
    words: string[];
}

/**
 * Analyze word chains (words containing a common core)
 * Finds groups of words where one word is contained in others
 */
export function analyzeCoreChains(
    allPossibleWords: Set<string>,
    foundWords: Set<string>
): CoreChain[] {
    const allWords = Array.from(allPossibleWords);
    const clusters = new Map<string, { words: string[]; score: number }>();

    // Find chains for each potential core word
    for (const core of allWords) {
        const cluster = allWords.filter(w => w.includes(core));

        if (cluster.length >= 3) {
            const totalScore = cluster.reduce((sum, w) => sum + calculateScore(w), 0);
            clusters.set(core, { words: cluster, score: totalScore });
        }
    }

    // Sort by score (descending) and core length (ascending for tiebreak)
    const sortedCores = Array.from(clusters.keys()).sort((a, b) => {
        const scoreA = clusters.get(a)!.score;
        const scoreB = clusters.get(b)!.score;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.length - b.length;
    });

    // Filter out subset duplicates
    const result: CoreChain[] = [];
    const usedWordSets: Set<string>[] = [];

    for (const core of sortedCores) {
        const clusterData = clusters.get(core)!;
        const clusterWords = new Set(clusterData.words);

        // Skip if this cluster is a subset of an existing one
        const isSubset = usedWordSets.some(existingSet =>
            Array.from(clusterWords).every(w => existingSet.has(w))
        );

        if (!isSubset) {
            result.push({
                core,
                words: clusterData.words.sort((a, b) => a.length - b.length),
                totalScore: clusterData.score
            });
            usedWordSets.push(clusterWords);
        }

        if (result.length >= 8) break; // Limit to top 8
    }

    return result;
}

/**
 * Group words by anagrams (same letters, different arrangement)
 */
export function analyzeAnagrams(
    allPossibleWords: Set<string>
): AnagramSet[] {
    const anagramGroups = new Map<string, string[]>();

    for (const word of allPossibleWords) {
        // Create canonical key by sorting letters
        const key = word.split('').sort().join('');

        if (!anagramGroups.has(key)) {
            anagramGroups.set(key, []);
        }
        anagramGroups.get(key)!.push(word);
    }

    // Filter groups with 3+ words and sort by group size
    const result = Array.from(anagramGroups.values())
        .filter(group => group.length >= 3)
        .sort((a, b) => b.length - a.length)
        .slice(0, 8) // Top 8 anagram sets
        .map(words => ({
            words: words.sort()
        }));

    return result;
}

/**
 * Get all words sorted by length (for full word list display)
 */
export function getWordsByLength(allPossibleWords: Set<string>): string[] {
    return Array.from(allPossibleWords).sort((a, b) => {
        if (b.length !== a.length) return b.length - a.length;
        return a.localeCompare(b);
    });
}
