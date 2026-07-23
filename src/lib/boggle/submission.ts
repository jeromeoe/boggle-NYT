import { calculateTotalScore } from './scoring';

export class SubmissionValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SubmissionValidationError';
    }
}

export interface CanonicalSubmission {
    wordsFound: string[];
    wordsPenalized: string[];
    grossScore: number;
    penaltyScore: number;
    netScore: number;
    isComplete: boolean;
}

function normalizeWords(words: string[], label: string): string[] {
    const normalized = words.map((word) => word.trim().toUpperCase());
    const unique = new Set(normalized);

    if (unique.size !== normalized.length) {
        throw new SubmissionValidationError(`${label} contains duplicate words`);
    }

    for (const word of normalized) {
        if (word.length < 3 || !/^[A-Z]+$/.test(word)) {
            throw new SubmissionValidationError(`${label} contains an invalid word`);
        }
    }

    return normalized;
}

/**
 * Rebuild the score from a server-solved board. This rejects fabricated valid
 * words, fabricated penalties, duplicates, and client-provided score totals.
 */
export function canonicalizeSubmission(
    allPossibleWords: Set<string>,
    claimedFoundWords: string[],
    claimedPenalizedWords: string[],
): CanonicalSubmission {
    const wordsFound = normalizeWords(claimedFoundWords, 'Found words');
    const wordsPenalized = normalizeWords(claimedPenalizedWords, 'Penalized words');
    const foundSet = new Set(wordsFound);

    for (const word of wordsFound) {
        if (!allPossibleWords.has(word)) {
            throw new SubmissionValidationError(`Found word is not on the board: ${word}`);
        }
    }

    for (const word of wordsPenalized) {
        if (allPossibleWords.has(word)) {
            throw new SubmissionValidationError(`Penalized word is valid on the board: ${word}`);
        }
        if (foundSet.has(word)) {
            throw new SubmissionValidationError(`Word appears in both result lists: ${word}`);
        }
    }

    const scores = calculateTotalScore(wordsFound, wordsPenalized);
    return {
        wordsFound,
        wordsPenalized,
        grossScore: scores.gross,
        penaltyScore: scores.penalty,
        netScore: scores.net,
        isComplete: wordsFound.length === allPossibleWords.size,
    };
}
