import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { buildTrie, type Trie } from './trie';

let dictionaryPromise: Promise<{ words: Set<string>; trie: Trie }> | null = null;

/** Load and cache CSW24 directly from disk for trusted server-side validation. */
export function getServerDictionary(): Promise<{ words: Set<string>; trie: Trie }> {
    if (!dictionaryPromise) {
        dictionaryPromise = (async () => {
            const dictionaryPath = path.join(process.cwd(), 'public', 'data', 'csw24-words.json');
            const raw = await readFile(dictionaryPath, 'utf8');
            const wordList = JSON.parse(raw) as string[];
            const normalized = wordList.map((word) => word.toUpperCase());
            return { words: new Set(normalized), trie: buildTrie(normalized) };
        })();
    }

    return dictionaryPromise;
}
