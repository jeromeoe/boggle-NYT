import { Trie } from './trie';

/**
 * Practice quiz utilities for 2x2 grid word finding
 */

export interface PracticeQuiz {
    grid: string[][];
    letters: string; // Flattened letters for display
    validWords: Set<string>;
    difficulty: 'easy' | 'medium' | 'hard';
}

/**
 * Generate all possible words from a 2x2 grid
 */
function findAllWordsIn2x2Grid(grid: string[][], trie: Trie): Set<string> {
    const foundWords = new Set<string>();
    const rows = 2;
    const cols = 2;

    function dfs(
        r: number,
        c: number,
        path: Set<string>,
        currentWord: string,
        node: any
    ): void {
        const letter = grid[r][c];
        const pathKey = `${r},${c}`;

        // Check if this letter exists in trie from current node
        let nextNode = node;
        for (const char of letter) {
            if (nextNode.children.has(char)) {
                nextNode = nextNode.children.get(char);
            } else {
                return; // Dead end
            }
        }

        const newWord = currentWord + letter;
        const newPath = new Set([...path, pathKey]);

        // Check if valid word (3+ letters)
        if (nextNode.isEndOfWord && newWord.length >= 3) {
            foundWords.add(newWord);
        }

        // Explore neighbors
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        for (const [dr, dc] of directions) {
            const nr = r + dr;
            const nc = c + dc;
            const neighborKey = `${nr},${nc}`;

            if (
                nr >= 0 && nr < rows &&
                nc >= 0 && nc < cols &&
                !newPath.has(neighborKey)
            ) {
                dfs(nr, nc, newPath, newWord, nextNode);
            }
        }
    }

    // Start DFS from each position
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            dfs(r, c, new Set(), "", trie.root);
        }
    }

    return foundWords;
}

/**
 * Generate a random 2x2 practice grid
 */
export function generatePracticeQuiz(trie: Trie, targetDifficulty: 'easy' | 'medium' | 'hard' = 'medium'): PracticeQuiz {
    const commonLetters = 'EARIOTNSLCUDPMHGBFYWKVXZJQ';
    const vowels = 'AEIOU';
    const consonants = 'BCDFGHJKLMNPQRSTVWXYZ';

    let bestQuiz: PracticeQuiz | null = null;
    let attempts = 0;
    const maxAttempts = 100;

    // Target word counts based on difficulty
    const targets = {
        easy: { min: 3, max: 8 },
        medium: { min: 8, max: 15 },
        hard: { min: 15, max: 30 }
    };

    const target = targets[targetDifficulty];

    while (attempts < maxAttempts) {
        attempts++;

        // Generate 4 letters (2x2 grid)
        // Ensure at least 1 vowel
        const letters: string[] = [];

        // First letter: weighted random
        letters.push(commonLetters[Math.floor(Math.random() * 10)]);

        // Second letter: vowel (50% chance) or consonant
        letters.push(Math.random() < 0.5
            ? vowels[Math.floor(Math.random() * vowels.length)]
            : consonants[Math.floor(Math.random() * consonants.length)]
        );

        // Third and fourth: weighted random
        letters.push(commonLetters[Math.floor(Math.random() * 15)]);
        letters.push(commonLetters[Math.floor(Math.random() * 15)]);

        // Shuffle the letters
        for (let i = letters.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [letters[i], letters[j]] = [letters[j], letters[i]];
        }

        // Create 2x2 grid
        const grid = [
            [letters[0], letters[1]],
            [letters[2], letters[3]]
        ];

        // Find all valid words
        const validWords = findAllWordsIn2x2Grid(grid, trie);

        // Check if this meets difficulty requirements
        const wordCount = validWords.size;
        if (wordCount >= target.min && wordCount <= target.max) {
            return {
                grid,
                letters: letters.join(''),
                validWords,
                difficulty: targetDifficulty
            };
        }

        // Keep track of best attempt
        if (!bestQuiz || Math.abs(wordCount - (target.min + target.max) / 2) <
            Math.abs(bestQuiz.validWords.size - (target.min + target.max) / 2)) {
            bestQuiz = {
                grid,
                letters: letters.join(''),
                validWords,
                difficulty: targetDifficulty
            };
        }
    }

    // Return best attempt if we couldn't find perfect match
    return bestQuiz!;
}

/**
 * Generate a practice quiz with specific letters
 */
export function generatePracticeQuizFromLetters(letters: string, trie: Trie): PracticeQuiz {
    const clean = letters.toUpperCase().replace(/[^A-Z]/g, '');

    if (clean.length !== 4) {
        throw new Error('Must provide exactly 4 letters');
    }

    const grid = [
        [clean[0], clean[1]],
        [clean[2], clean[3]]
    ];

    const validWords = findAllWordsIn2x2Grid(grid, trie);

    // Determine difficulty based on word count
    let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
    if (validWords.size < 8) difficulty = 'easy';
    else if (validWords.size > 15) difficulty = 'hard';

    return {
        grid,
        letters: clean,
        validWords,
        difficulty
    };
}
