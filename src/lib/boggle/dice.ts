/**
 * New Boggle Dice configuration (16 dice)
 * Each die has 6 faces with specific letter distributions
 */
export const NEW_BOGGLE_DICE = [
    "AAEEGN", "ABBJOO", "ACHOPS", "AFFKPS",
    "AOOTTW", "CIMOTU", "DEILRX", "DELRVY",
    "DISTTY", "EEGHNW", "EEINSU", "EHRTVW",
    "EIOSST", "ELRTTY", "HIMNUQU", "HLNNRZ"
];

/**
 * Generate a random 4x4 Boggle board
 * Uses the New Boggle dice configuration
 */
export function generateBoard(): string[][] {
    // Shuffle the dice
    const shuffled = [...NEW_BOGGLE_DICE].sort(() => Math.random() - 0.5);

    // Roll each die and get a random face
    const boardLetters: string[] = [];
    for (const die of shuffled) {
        const randomFace = die[Math.floor(Math.random() * die.length)];
        // Q represents "QU" in Boggle
        boardLetters.push(randomFace === 'Q' ? 'QU' : randomFace);
    }

    // Convert to 4x4 grid
    const board: string[][] = [];
    for (let i = 0; i < 16; i += 4) {
        board.push(boardLetters.slice(i, i + 4));
    }

    return board;
}

/**
 * Simple seeded random number generator (Mulberry32)
 * Returns a deterministic pseudo-random number between 0 and 1
 */
function seededRandom(seed: number): () => number {
    return function () {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Generate a deterministic 4x4 Boggle board from a seed
 * Same seed = same board every time
 * @param seed - Integer seed for board generation
 */
export function generateBoardWithSeed(seed: number): string[][] {
    const rng = seededRandom(seed);

    // Shuffle the dice using seeded random
    const shuffled = [...NEW_BOGGLE_DICE];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Roll each die using seeded random
    const boardLetters: string[] = [];
    for (const die of shuffled) {
        const randomFace = die[Math.floor(rng() * die.length)];
        boardLetters.push(randomFace === 'Q' ? 'QU' : randomFace);
    }

    // Convert to 4x4 grid
    const board: string[][] = [];
    for (let i = 0; i < 16; i += 4) {
        board.push(boardLetters.slice(i, i + 4));
    }

    return board;
}

/**
 * Parse custom board input from user
 * @param input - 16 character string (Q represents QU)
 * @returns 4x4 board or null if invalid
 */
export function parseCustomBoard(input: string): string[][] | null {
    // Clean input: only letters and underscores
    const clean = input.toUpperCase().replace(/[^A-Z_]/g, '');

    if (clean.length !== 16) {
        return null;
    }

    // Convert to board format
    const boardLetters = clean.split('').map(char =>
        char === 'Q' ? 'QU' : char
    );

    const board: string[][] = [];
    for (let i = 0; i < 16; i += 4) {
        board.push(boardLetters.slice(i, i + 4));
    }

    return board;
}
