/**
 * Trie Node for efficient word lookup
 */
export class TrieNode {
    children: Map<string, TrieNode>;
    isEndOfWord: boolean;

    constructor() {
        this.children = new Map();
        this.isEndOfWord = false;
    }
}

/**
 * Trie data structure for CSW24 dictionary
 */
export class Trie {
    root: TrieNode;

    constructor() {
        this.root = new TrieNode();
    }

    /**
     * Insert a word into the Trie
     */
    insert(word: string): void {
        let node = this.root;
        for (const char of word) {
            if (!node.children.has(char)) {
                node.children.set(char, new TrieNode());
            }
            node = node.children.get(char)!;
        }
        node.isEndOfWord = true;
    }

    /**
     * Check if a word exists in the dictionary
     */
    search(word: string): boolean {
        let node = this.root;
        for (const char of word) {
            if (!node.children.has(char)) {
                return false;
            }
            node = node.children.get(char)!;
        }
        return node.isEndOfWord;
    }

    /**
     * Check if any word starts with the given prefix
     */
    startsWith(prefix: string): boolean {
        let node = this.root;
        for (const char of prefix) {
            if (!node.children.has(char)) {
                return false;
            }
            node = node.children.get(char)!;
        }
        return true;
    }

    /**
     * Get the node at the end of a prefix (for DFS traversal)
     */
    getNode(prefix: string): TrieNode | null {
        let node = this.root;
        for (const char of prefix) {
            if (!node.children.has(char)) {
                return null;
            }
            node = node.children.get(char)!;
        }
        return node;
    }
}

/**
 * Build Trie from word list
 */
export function buildTrie(words: string[]): Trie {
    const trie = new Trie();
    for (const word of words) {
        trie.insert(word.toUpperCase());
    }
    return trie;
}

/**
 * Load CSW24 dictionary and build Trie
 */
export async function loadDictionary(): Promise<{ words: Set<string>; trie: Trie }> {
    const response = await fetch('/data/csw24-words.json');
    const wordList: string[] = await response.json();

    const words = new Set(wordList.map(w => w.toUpperCase()));
    const trie = buildTrie(wordList);

    return { words, trie };
}
