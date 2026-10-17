/** Row-major board geometry helpers. */
export type Grid = { w: number; h: number }

export const idx = (g: Grid, r: number, c: number) => r * g.w + c
export const rc = (g: Grid, i: number) => ({ r: Math.floor(i / g.w), c: i % g.w })
export const inBounds = (g: Grid, r: number, c: number) => r >= 0 && r < g.h && c >= 0 && c < g.w

export function neighbors4(g: Grid, i: number): number[] {
  const { r, c } = rc(g, i)
  const out: number[] = []
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    if (inBounds(g, r + dr, c + dc)) out.push(idx(g, r + dr, c + dc))
  }
  return out
}

export function areNeighbors(g: Grid, a: number, b: number): boolean {
  const p = rc(g, a), q = rc(g, b)
  return Math.abs(p.r - q.r) + Math.abs(p.c - q.c) === 1 && a >= 0 && b >= 0 && a < g.w * g.h && b < g.w * g.h
}
