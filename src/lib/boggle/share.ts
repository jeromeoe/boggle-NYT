export const SHAREABLE_GAME_MODES = ['random', 'open', 'closed', 'blitz', 'rapid', 'zen'] as const;

export type ShareableGameMode = typeof SHAREABLE_GAME_MODES[number];

export interface SeededChallenge {
    seed: number;
    mode: ShareableGameMode;
}

const TOKEN_VERSION = 'v1';
const MAX_SEED = 0xFFFFFFFF;

export function createRandomBoardSeed(): number {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return values[0];
}

export function encodeSeededChallenge(challenge: SeededChallenge): string {
    if (!Number.isInteger(challenge.seed) || challenge.seed < 0 || challenge.seed > MAX_SEED) {
        throw new Error('Challenge seed must be an unsigned 32-bit integer');
    }
    if (!SHAREABLE_GAME_MODES.includes(challenge.mode)) {
        throw new Error('Unsupported challenge mode');
    }

    return `${TOKEN_VERSION}.${challenge.mode}.${challenge.seed.toString(36)}`;
}

export function parseSeededChallenge(token: string | null | undefined): SeededChallenge | null {
    if (!token || token.length > 40) return null;
    const [version, rawMode, rawSeed, extra] = token.toLowerCase().split('.');
    if (version !== TOKEN_VERSION || extra !== undefined || !rawMode || !rawSeed) return null;
    if (!SHAREABLE_GAME_MODES.includes(rawMode as ShareableGameMode)) return null;
    if (!/^[0-9a-z]{1,7}$/.test(rawSeed)) return null;

    const seed = Number.parseInt(rawSeed, 36);
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > MAX_SEED) return null;
    return { seed, mode: rawMode as ShareableGameMode };
}

export function createSeededChallengeUrl(origin: string, challenge: SeededChallenge): string {
    const url = new URL('/play', origin);
    url.searchParams.set('challenge', encodeSeededChallenge(challenge));
    return url.toString();
}

export function getChallengeModeLabel(mode: ShareableGameMode): string {
    switch (mode) {
        case 'open': return 'Open Board';
        case 'closed': return 'Closed Board';
        case 'blitz': return 'Blitz';
        case 'rapid': return 'Rapid';
        case 'zen': return 'Zen';
        default: return 'Random Board';
    }
}
