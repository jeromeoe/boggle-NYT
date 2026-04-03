"use client";

import { useState, useEffect } from "react";
import { loadDictionary } from "@/lib/boggle/trie";
import type { Trie } from "@/lib/boggle/trie";

// Module-level cache so subsequent hook calls reuse the already-loaded trie
let cachedTrie: Trie | null = null;
let cachedWords: Set<string> | null = null;
let loadPromise: Promise<void> | null = null;

export function useDictionary() {
    const [trie, setTrie] = useState<Trie | null>(cachedTrie);
    const [validWords, setValidWords] = useState<Set<string>>(cachedWords ?? new Set());
    const [dictionaryLoaded, setDictionaryLoaded] = useState(cachedTrie !== null);

    useEffect(() => {
        if (cachedTrie) {
            setTrie(cachedTrie);
            setValidWords(cachedWords!);
            setDictionaryLoaded(true);
            return;
        }

        if (!loadPromise) {
            loadPromise = loadDictionary().then(({ words, trie: loadedTrie }) => {
                cachedTrie = loadedTrie;
                cachedWords = words;
            });
        }

        loadPromise.then(() => {
            setTrie(cachedTrie);
            setValidWords(cachedWords!);
            setDictionaryLoaded(true);
        });
    }, []);

    return { trie, validWords, dictionaryLoaded };
}
