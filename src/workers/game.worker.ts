import { buildTrie, Trie } from "../lib/boggle/trie";
import { findAllWords } from "../lib/boggle/solver";

let trie: Trie | null = null;
let validWords: Set<string> | null = null;

// Listen for messages from the main thread
self.onmessage = async (e: MessageEvent) => {
    const { type, payload } = e.data;

    switch (type) {
        case "INIT":
            try {
                // Fetch dictionary (assuming absolute path from public)
                // We don't use loadDictionary from trie.ts because we want to control the fetch base if needed,
                // but strictly speaking /data/... should work.
                // improved robustness:
                const response = await fetch('/data/csw24-words.json');
                const wordList: string[] = await response.json();

                validWords = new Set(wordList.map(w => w.toUpperCase()));
                trie = buildTrie(wordList);

                self.postMessage({ type: "READY", payload: { count: wordList.length } });
            } catch (error) {
                self.postMessage({ type: "ERROR", payload: "Failed to load dictionary" });
            }
            break;

        case "SOLVE":
            if (!trie) {
                self.postMessage({ type: "ERROR", payload: "Trie not initialized" });
                return;
            }
            const board = payload.board;
            const found = findAllWords(board, trie);
            // Convert Set to Array for transport
            self.postMessage({ type: "SOLVED", payload: Array.from(found) });
            break;

        case "VALIDATE":
            // Optional: if we want to check if a word is in dictionary (not just on board)
            // But we usually send the whole validWords set to valid_words set?? 
            // Actually, passing the whole dictionary set (280k words) to main thread is heavy (JS Set overhead).
            // Better to ask worker or just keep it here?
            // Main thread needs `validWords` to know if "Not on board" vs "Not in dictionary".
            // 280k strings is about ~3-5MB. Transferable?
            // Let's rely on the worker for "on board" checks. 
            // But the main thread logic in `useGameLogic` currently does:
            // `const reason = validWords.has(normalizedWord) ? "Not on board" : "Not in dictionary";`
            // So it needs `validWords`.
            // 
            // We can optimize this by having the worker validate completely:
            // Main thread sends "SUBMIT word". Worker says "VALID" or "INVALID_BOARD" or "INVALID_DICT".
            // But for standard gameplay, we passed "allPossibleWords" to main thread.
            // "allPossibleWords" is Words On Board.
            // If a user types "APPLE", and "APPLE" is not in "allPossibleWords", we need to know why.
            // Is it because it's not in the dictionary? Or because it's not on the board?

            // Simplest solution: Send `validWords` Set size or Bloom filter?
            // Or just expose a `CHECK_DICT` message. Async validation is slightly annoying for UI but fine.
            // OR, just fetch the word list in main thread too? No, that defeats the purpose.

            // Let's implement a "CHECK" message.
            if (!validWords) return;
            const word = payload.word;
            const inDict = validWords.has(word);
            self.postMessage({ type: "CHECK_RESULT", payload: { word, inDict } });
            break;
    }
};
