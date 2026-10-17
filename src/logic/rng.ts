/** Seeded PRNG (mulberry32). The whole game logic draws from it, so a level
 * replays identically from its seed and the saved state. */
export type Rng = { next(): number; int(n: number): number; state(): number }

export function makeRng(seed: number): Rng {
  let s = seed >>> 0
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return { next, int: (n) => Math.floor(next() * n), state: () => s }
}
