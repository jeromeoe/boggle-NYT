import { Trie, TrieNode } from './trie';

type Position = [number, number];

/**
 * Find all valid words on the Boggle board using DFS with Trie pruning
 * This is a direct port of the Python algorithm
 */
export function findAllWords(board: string[][], trie: Trie): Set<string> {
    const foundWords = new Set<string>();
    const rows = 4;
    const cols = 4;

    /**
     * DFS helper function
     * @param r - Current row
     * @param c - Current column
     * @param path - Set of visited positions
     * @param node - Current Trie node
     * @param prefix - Current word prefix
     */
    function dfs(
        r: number,
        c: number,
        path: Set<string>,
        node: TrieNode,
        prefix: string
    ): void {
        const dieString = board[r][c];
        const pathKey = `${r},${c}`;
        const newPath = new Set([...path, pathKey]);

        // Try to traverse the die string through the Trie
        let currNode = node;
        let currPrefix = prefix;
        let possible = true;

        for (const char of dieString) {
            if (currNode.children.has(char)) {
                currNode = currNode.children.get(char)!;
                currPrefix += char;
            } else {
                possible = false;
                break;
            }
        }

        if (possible) {
            // Check if we've found a valid word (3+ letters)
            if (currNode.isEndOfWord && currPrefix.length >= 3) {
                foundWords.add(currPrefix);
            }

            // Continue DFS to neighbors
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue; // Skip current cell

                    const nr = r + dr;
                    const nc = c + dc;
                    const neighborKey = `${nr},${nc}`;

                    if (
                        nr >= 0 && nr < rows &&
                        nc >= 0 && nc < cols &&
                        !newPath.has(neighborKey)
                    ) {
                        dfs(nr, nc, newPath, currNode, currPrefix);
                    }
                }
            }
        }

        // Special handling for "QU" die when treated as just "Q"
        // This handles words that use Q without U
        if (dieString === "QU") {
            const char = "Q";
            if (node.children.has(char)) {
                const qNode = node.children.get(char)!;
                const qPrefix = prefix + char;

                if (qNode.isEndOfWord && qPrefix.length >= 3) {
                    foundWords.add(qPrefix);
                }

                // Continue DFS from Q node
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;

                        const nr = r + dr;
                        const nc = c + dc;
                        const neighborKey = `${nr},${nc}`;

                        if (
                            nr >= 0 && nr < rows &&
                            nc >= 0 && nc < cols &&
                            !newPath.has(neighborKey)
                        ) {
                            dfs(nr, nc, newPath, qNode, qPrefix);
                        }
                    }
                }
            }
        }
    }

    // Start DFS from every position on the board
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            dfs(r, c, new Set(), trie.root, "");
        }
    }

    return foundWords;
}

/**
 * Check if a word can be formed on the board (for validation)
 * Returns true if the word exists on the board path
 */
export function isWordOnBoard(
    word: string,
    board: string[][],
    trie: Trie
): boolean {
    const allWords = findAllWords(board, trie);
    return allWords.has(word.toUpperCase());
}
