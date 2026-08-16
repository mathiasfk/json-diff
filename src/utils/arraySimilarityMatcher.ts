/**
 * arraySimilarityMatcher.ts
 * --------------------------
 * Similarity-maximizing matching for two arrays of (complex) objects.
 *
 * SCORING APPROACH (see docs/array-similarity-matching.md for the full design)
 *
 * 1. Field-level similarity `fieldSimilarity(a, b, key)`:
 *      - number/number : 1 if equal, else max(0, 1 - |a-b|/max(|a|,|b|))
 *      - boolean       : 1 if equal else 0
 *      - string/string : case-insensitive, trimmed Levenshtein ratio
 *                        (1 - dist / maxLen) so typos stay high, exact = 1
 *      - object/array  : structural Jaccard of keys/elements
 *      - type mismatch / missing value : 0
 *
 * 2. Object-level similarity `objectSimilarity(x, y, weights)`:
 *      shared    = fields present AND non-null on BOTH sides
 *      weighted  = Σ weight(k) * fieldSimilarity / Σ weight(k)      (0..1)
 *      coverage  = |shared| / |union|
 *      score     = 0.7 * weighted + 0.3 * coverage
 *    Only fields present on both sides count as "shared", so missing fields
 *    never drag the score toward 0 and extra fields gently lower coverage.
 *    No common field => 0 (unrelated).
 *
 * 3. Pairing via the Hungarian algorithm (max-weight assignment, O(n^3)).
 *    Builds an n×m similarity matrix, pads to a square matrix with 0 for
 *    unequal lengths, and finds the one-to-one pairing that MAXIMIZES the sum
 *    of paired similarities. This is provably the similarity-maximizing pairing
 *    (greedy "best remaining partner" can fail on adversarial inputs).
 *
 * 4. A paired item whose similarity is STRICTLY GREATER than `threshold`
 *    (default 0) is treated as a real match (a modification). A score of
 *    exactly 0 means the two items share no common field and are therefore
 *    UNRELATED, so they are reported as unmatched (added/removed) rather than a
 *    meaningless "modification". Raise the threshold (e.g. 0.3) to force weak
 *    but non-zero pairs into added/removed.
 *
 * The result is deterministic: tie-breaks resolve by lowest index, so reruns
 * are stable. The function does NOT mutate the inputs.
 */

export type FieldWeights = Record<string, number>;

export const DEFAULT_WEIGHTS: FieldWeights = {
  name: 3,
  id: 2,
  description: 2,
  default: 1,
};

export interface SimilarityResult {
  /** Paired items: (leftIndex, rightIndex, similarityScore). */
  pairs: Array<{ leftIndex: number; rightIndex: number; score: number }>;
  /** Left indices with no matching right item (removed). */
  unmatchedLeft: number[];
  /** Right indices with no matching left item (added). */
  unmatchedRight: number[];
  /** The full n×m similarity matrix (row = left, col = right). */
  matrix: number[][];
  /** Sum of the paired similarities (the quantity maximized). */
  totalSimilarity: number;
}

export interface MatchOptions {
  weights?: FieldWeights;
  /** Pairs scoring below this are reported as unmatched. Default 0. */
  threshold?: number;
}

// ---------- Levenshtein ratio (normalized, dependency-free) ----------

function normalizedLevenshteinRatio(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0 && n === 0) return 1;
  // dp[i][j] = distance between a[0..i) and b[0..j)
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array<number>(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  const dist = dp[m][n];
  return 1 - dist / Math.max(m, n);
}

// ---------- structural Jaccard for nested values ----------

function structuralSimilarity(a: unknown, b: unknown): number {
  if (Array.isArray(a) && Array.isArray(b)) {
    const sa = new Set(a.map((x) => JSON.stringify(x)));
    const sb = new Set(b.map((x) => JSON.stringify(x)));
    let inter = 0;
    for (const k of sa) if (sb.has(k)) inter++;
    const union = sa.size + sb.size - inter;
    return union === 0 ? 1 : inter / union;
  }
  const sa = new Set(Object.keys(a as object));
  const sb = new Set(Object.keys(b as object));
  let inter = 0;
  for (const k of sa) if (sb.has(k)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 1 : inter / union;
}

// ---------- field-level similarity ----------

export function fieldSimilarity(a: unknown, b: unknown): number {
  if (a === null || a === undefined || b === null || b === undefined) return 0;

  const at = typeof a;
  const bt = typeof b;

  if (at === 'number' && bt === 'number') {
    if (a === b) return 1;
    const mag = Math.max(Math.abs(a as number), Math.abs(b as number));
    const ratio = mag === 0 ? 0 : Math.abs((a as number) - (b as number)) / mag;
    return Math.max(0, 1 - ratio);
  }

  if (at === 'boolean' && bt === 'boolean') {
    return a === b ? 1 : 0;
  }

  if (at === 'string' && bt === 'string') {
    const sa = (a as string).trim().toLowerCase();
    const sb = (b as string).trim().toLowerCase();
    if (sa === sb) return 1;
    return normalizedLevenshteinRatio(sa, sb);
  }

  if (at === 'object' && bt === 'object') {
    return structuralSimilarity(a, b);
  }

  // type mismatch
  return 0;
}

// ---------- object-level similarity ----------

export function objectSimilarity(
  x: Record<string, unknown>,
  y: Record<string, unknown>,
  weights: FieldWeights = DEFAULT_WEIGHTS
): number {
  const keysX = Object.keys(x).filter((k) => x[k] !== null && x[k] !== undefined);
  const keysY = Object.keys(y).filter((k) => y[k] !== null && y[k] !== undefined);
  const shared = keysX.filter((k) => keysY.includes(k));
  const union = new Set<string>([...keysX, ...keysY]);

  if (shared.length === 0) return 0; // no common field => unrelated

  let wSum = 0;
  let wScore = 0;
  for (const k of shared) {
    const w = weights[k] ?? weights.default ?? 1;
    wSum += w;
    wScore += w * fieldSimilarity(x[k], y[k]);
  }

  const weightedShared = wSum === 0 ? 0 : wScore / wSum;
  const coverage = shared.length / union.size;

  return 0.7 * weightedShared + 0.3 * coverage;
}

// ---------- Hungarian algorithm (max-weight assignment) ----------

/**
 * Returns a square assignment of length N = max(n, m) where `assignment[i]` is
 * the column index (0..N-1) paired with row i. Padded cells (beyond the real
 * n×m submatrix) carry similarity 0, so dummy rows/columns absorb the slack.
 */
function hungarianMaxAssignment(sim: number[][]): number[] {
  const n = sim.length;
  const m = n > 0 ? sim[0].length : 0;
  const N = Math.max(n, m);
  if (N === 0) return [];

  // Build the square cost matrix (we maximize similarity, so negate).
  const C: number[][] = Array.from({ length: N }, (_, i) =>
    Array.from({ length: N }, (_, j) => (i < n && j < m ? -sim[i][j] : 0))
  );

  const u = new Array<number>(N + 1).fill(0);
  const v = new Array<number>(N + 1).fill(0);
  const p = new Array<number>(N + 1).fill(0); // p[j] = row assigned to column j
  const way = new Array<number>(N + 1).fill(0);

  for (let i = 1; i <= N; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array<number>(N + 1).fill(Infinity);
    const used = new Array<boolean>(N + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = -1;
      for (let j = 1; j <= N; j++) {
        if (!used[j]) {
          const cur = C[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }
      for (let j = 0; j <= N; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }

  const assignment = new Array<number>(N).fill(-1);
  for (let j = 1; j <= N; j++) {
    if (p[j] > 0) assignment[p[j] - 1] = j - 1;
  }
  return assignment;
}

// ---------- public matcher ----------

/**
 * Match every left item with its globally best right partner, maximizing total
 * similarity. Deterministic: ties resolve by lowest index.
 */
export function matchArraysMaxSimilarity(
  left: Record<string, unknown>[],
  right: Record<string, unknown>[],
  options: MatchOptions = {}
): SimilarityResult {
  const weights = options.weights ?? DEFAULT_WEIGHTS;
  const threshold = options.threshold ?? 0;

  const n = left.length;
  const m = right.length;

  const matrix: number[][] = left.map((x) =>
    right.map((y) => objectSimilarity(x, y, weights))
  );

  const assignment = hungarianMaxAssignment(matrix);

  const pairs: SimilarityResult['pairs'] = [];
  const usedRight = new Set<number>();

  for (let i = 0; i < n; i++) {
    const j = assignment[i];
    if (j !== -1 && j < m) {
      const score = matrix[i][j];
      // Strictly greater than threshold => real match. Exactly 0 == unrelated.
      if (score > threshold) {
        pairs.push({ leftIndex: i, rightIndex: j, score });
        usedRight.add(j);
      }
    }
  }

  const pairedLeft = new Set(pairs.map((p) => p.leftIndex));
  const unmatchedLeft = Array.from({ length: n }, (_, i) => i).filter(
    (i) => !pairedLeft.has(i)
  );
  const unmatchedRight = Array.from({ length: m }, (_, j) => j).filter(
    (j) => !usedRight.has(j)
  );

  const totalSimilarity = pairs.reduce((sum, p) => sum + p.score, 0);

  return { pairs, unmatchedLeft, unmatchedRight, matrix, totalSimilarity };
}
