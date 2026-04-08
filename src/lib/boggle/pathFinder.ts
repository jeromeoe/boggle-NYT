export interface CandidateTrail {
  /** Set of "r,c" keys for tiles that are part of at least one valid path */
  activeCells: Set<string>;
  /** Set of normalized "r1,c1-r2,c2" keys for edges in at least one valid path */
  activeEdges: Set<string>;
}

function edgeKey(r1: number, c1: number, r2: number, c2: number): string {
  // Normalize so the edge A->B and B->A produce the same key
  if (r1 < r2 || (r1 === r2 && c1 < c2)) {
    return `${r1},${c1}-${r2},${c2}`;
  }
  return `${r2},${c2}-${r1},${c1}`;
}

type Step = { row: number; col: number };

/**
 * Given a typed prefix and the current board, return the cells and edges for
 * a single valid path that spells the prefix. When multiple paths exist the
 * first one discovered via DFS wins — the visualisation stays clean instead
 * of showing a tangle of every possibility.
 *
 * Returns empty sets when prefix is empty or impossible.
 */
export function findCandidateTrail(prefix: string, board: string[][]): CandidateTrail {
  const activeCells = new Set<string>();
  const activeEdges = new Set<string>();

  if (!prefix || board.length === 0 || board[0].length === 0) {
    return { activeCells, activeEdges };
  }

  const rows = board.length;
  const cols = board[0].length;
  const upper = prefix.toUpperCase();

  function dfs(
    r: number,
    c: number,
    matched: number,
    visited: Set<string>,
    path: Step[]
  ): Step[] | null {
    const cell = board[r][c]; // e.g. "S", "QU", "E"
    const remaining = upper.slice(matched);

    if (!remaining.startsWith(cell)) return null;

    const newMatched = matched + cell.length;
    const newPath: Step[] = [...path, { row: r, col: c }];

    if (newMatched === upper.length) {
      return newPath;
    }

    const newVisited = new Set([...visited, `${r},${c}`]);

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (
          nr >= 0 && nr < rows &&
          nc >= 0 && nc < cols &&
          !newVisited.has(`${nr},${nc}`)
        ) {
          const found = dfs(nr, nc, newMatched, newVisited, newPath);
          if (found) return found; // first match wins — bail out early
        }
      }
    }

    return null;
  }

  let winner: Step[] | null = null;
  outer: for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      winner = dfs(r, c, 0, new Set(), []);
      if (winner) break outer;
    }
  }

  if (winner) {
    winner.forEach((pos, idx) => {
      activeCells.add(`${pos.row},${pos.col}`);
      if (idx > 0) {
        const prev = winner![idx - 1];
        activeEdges.add(edgeKey(prev.row, prev.col, pos.row, pos.col));
      }
    });
  }

  return { activeCells, activeEdges };
}
