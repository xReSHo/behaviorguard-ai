// A self-contained Isolation Forest implementation in TypeScript.
// Mirrors scikit-learn's IsolationForest behavior closely enough for this
// case study: builds an ensemble of iTrees on random sub-samples, then scores
// points by average path length. Shorter paths => more anomalous.

export interface IsolationForestOptions {
  nEstimators?: number;
  maxSamples?: number; // defaults to min(256, n)
  contamination?: number; // expected fraction of anomalies
  randomSeed?: number;
}

interface ITreeNode {
  splitFeature: number | null;
  splitValue: number | null;
  left: ITreeNode | null;
  right: ITreeNode | null;
  size: number; // number of training points in this node
}

// Mulberry32 PRNG for deterministic seeding.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Expected average path length of an unsuccessful BST search for n points.
function expectedPathLength(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  // H(n-1) approximation
  const H = Math.log(n - 1) + 0.5772156649;
  return 2 * H - 2 * (n - 1) / n;
}

function buildTree(
  data: number[][],
  indices: number[],
  depth: number,
  maxDepth: number,
  rng: () => number,
): ITreeNode {
  if (
    indices.length <= 1 ||
    depth >= maxDepth ||
    indices.length < 2
  ) {
    return { splitFeature: null, splitValue: null, left: null, right: null, size: indices.length };
  }

  // Find a feature with non-zero range among the sampled points.
  const nFeatures = data[0].length;
  let feature = -1;
  let min = Infinity;
  let max = -Infinity;
  const tried = new Set<number>();
  while (tried.size < nFeatures) {
    const f = Math.floor(rng() * nFeatures);
    tried.add(f);
    let lo = Infinity;
    let hi = -Infinity;
    for (const i of indices) {
      const v = data[i][f];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (hi > lo) {
      feature = f;
      min = lo;
      max = hi;
      break;
    }
  }

  if (feature === -1) {
    return { splitFeature: null, splitValue: null, left: null, right: null, size: indices.length };
  }

  const splitValue = min + rng() * (max - min);
  const left: number[] = [];
  const right: number[] = [];
  for (const i of indices) {
    if (data[i][feature] < splitValue) left.push(i);
    else right.push(i);
  }

  return {
    splitFeature: feature,
    splitValue,
    left: buildTree(data, left, depth + 1, maxDepth, rng),
    right: buildTree(data, right, depth + 1, maxDepth, rng),
    size: indices.length,
  };
}

function pathLength(point: number[], node: ITreeNode, depth: number): number {
  if (
    node.left === null ||
    node.right === null ||
    node.splitFeature === null ||
    node.splitValue === null
  ) {
    // external node
    return depth + expectedPathLength(node.size);
  }
  if (point[node.splitFeature] < node.splitValue) {
    return pathLength(point, node.left, depth + 1);
  }
  return pathLength(point, node.right, depth + 1);
}

export class IsolationForest {
  private trees: ITreeNode[] = [];
  private cNorm = 1;
  private opts: Required<IsolationForestOptions>;
  private nSamples = 0;

  constructor(opts: IsolationForestOptions = {}) {
    this.opts = {
      nEstimators: opts.nEstimators ?? 100,
      maxSamples: opts.maxSamples ?? 256,
      contamination: opts.contamination ?? 0.1,
      randomSeed: opts.randomSeed ?? 42,
    };
  }

  fit(X: number[][]): void {
    const n = X.length;
    const nFeatures = n > 0 ? X[0].length : 0;
    if (n === 0 || nFeatures === 0) {
      this.trees = [];
      this.cNorm = 1;
      return;
    }

    const maxSamples = Math.min(this.opts.maxSamples, n);
    const maxDepth = Math.ceil(Math.log2(Math.max(maxSamples, 2)));
    this.nSamples = maxSamples;
    this.cNorm = expectedPathLength(maxSamples);

    const rng = mulberry32(this.opts.randomSeed);
    this.trees = [];

    for (let t = 0; t < this.opts.nEstimators; t++) {
      // Random sub-sample without replacement.
      const pool = Array.from({ length: n }, (_, i) => i);
      const indices: number[] = [];
      for (let i = 0; i < maxSamples; i++) {
        const j = Math.floor(rng() * pool.length);
        indices.push(pool.splice(j, 1)[0]);
      }
      this.trees.push(buildTree(X, indices, 0, maxDepth, rng));
    }
  }

  // Returns the anomaly score for a single point. Lower => more anomalous,
  // matching scikit-learn's decision_function convention.
  score(point: number[]): number {
    if (this.trees.length === 0) return 0;
    let sum = 0;
    for (const tree of this.trees) {
      sum += pathLength(point, tree, 0);
    }
    const avg = sum / this.trees.length;
    return Math.pow(2, -(avg / this.cNorm));
  }

  // Returns scores for all points.
  scoreSamples(X: number[][]): number[] {
    return X.map((p) => this.score(p));
  }

  // Given the trained forest, returns a threshold on the anomaly score below
  // which a point is considered anomalous, derived from the contamination rate.
  threshold(): number {
    if (this.trees.length === 0) return 0;
    // Re-score the training data to estimate the score distribution.
    // Caller should pass training X via fit() first; we approximate by
    // requiring the caller to use predict() with X.
    return 0; // not used directly; predict() computes its own threshold.
  }

  // Predict labels for X using the contamination rate computed from the
  // training scores passed in `trainScores`.
  predict(X: number[][], trainScores: number[]): { label: number[]; scores: number[] } {
    const scores = X.map((p) => this.score(p));
    // Threshold: the contamination quantile of training scores.
    const sorted = [...trainScores].sort((a, b) => a - b);
    const idx = Math.floor(this.opts.contamination * sorted.length);
    const cutoff = sorted[Math.min(idx, sorted.length - 1)] ?? 0;
    const label = scores.map((s) => (s < cutoff ? -1 : 1));
    return { label, scores };
  }

  get isFitted(): boolean {
    return this.trees.length > 0;
  }
}
