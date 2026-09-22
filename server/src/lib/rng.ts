/**
 * Small seeded PRNG (mulberry32) so draw generation is reproducible from a
 * seed string — PRD §26: "For simulations, allow a seed or reproducible
 * mechanism during testing." Not cryptographically secure, which is fine
 * here: the seed itself (stored on the Draw/DrawSimulation row) is what
 * makes a result auditable/reproducible, not secrecy of the algorithm.
 */
export type Rng = () => number; // returns a float in [0, 1)

export function seedToUint32(seed: string): number {
  // FNV-1a style string hash -> 32-bit unsigned int.
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mulberry32(seed: string): Rng {
  let a = seedToUint32(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Picks `count` distinct integers from [1, max] without replacement, uniformly. */
export function pickUniqueUniform(rng: Rng, max: number, count: number): number[] {
  if (count > max) throw new Error(`Cannot pick ${count} unique numbers from a pool of ${max}`);
  const pool = Array.from({ length: max }, (_, i) => i + 1);
  const picked: number[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * pool.length);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

/**
 * Picks `count` distinct integers from [1, max] using weighted sampling
 * without replacement — each remaining candidate's chance is proportional
 * to its weight (falling back to 1 for unweighted numbers).
 */
export function pickUniqueWeighted(
  rng: Rng,
  max: number,
  count: number,
  weights: Map<number, number>
): number[] {
  if (count > max) throw new Error(`Cannot pick ${count} unique numbers from a pool of ${max}`);
  const pool = Array.from({ length: max }, (_, i) => ({ n: i + 1, w: weights.get(i + 1) ?? 1 }));
  const picked: number[] = [];

  for (let i = 0; i < count; i++) {
    const total = pool.reduce((sum, p) => sum + p.w, 0);
    let r = rng() * total;
    let idx = pool.length - 1;
    for (let j = 0; j < pool.length; j++) {
      r -= pool[j].w;
      if (r <= 0) {
        idx = j;
        break;
      }
    }
    picked.push(pool[idx].n);
    pool.splice(idx, 1);
  }
  return picked;
}
