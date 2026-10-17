// Valid-move check and shuffle retry loop adapted from Rune "Outmatched" (MIT), see NOTICE.
import { isTile, KINDS, type Cell, type FakeType, type Kind } from "./cells"
import { idx, rc, type Grid } from "./grid"
import { findMatches } from "./match"
import { isValidSwap, type Board } from "./resolve"
import type { Rng } from "./rng"

export type FakeSeed = { index: number; fake: FakeType; hp: number }

/** A kind that does not complete a line with the two cells to the left or above. */
function safeKind(g: Grid, cells: (Cell | null)[], i: number, rng: Rng): Kind {
  const { r, c } = rc(g, i)
  const banned = new Set<number>()
  const same = (a: number, b: number) => {
    const x = cells[a], y = cells[b]
    return isTile(x) && isTile(y) && x.kind === y.kind ? x.kind : -1
  }
  if (c >= 2) banned.add(same(idx(g, r, c - 1), idx(g, r, c - 2)))
  if (r >= 2) banned.add(same(idx(g, r - 1, c), idx(g, r - 2, c)))
  const options = Array.from({ length: KINDS }, (_, k) => k).filter((k) => !banned.has(k))
  return options[rng.int(options.length)] as Kind
}

export function hasValidMove(b: Board): boolean {
  const { g } = b
  for (let i = 0; i < g.w * g.h; i++) {
    const { r, c } = rc(g, i)
    if (c + 1 < g.w && isValidSwap(b, i, i + 1)) return true
    if (r + 1 < g.h && isValidSwap(b, i, i + g.w)) return true
  }
  return false
}

/** A fresh board with no ready matches and at least one valid move. */
export function generateBoard(g: Grid, rng: Rng, fakes: FakeSeed[]): Board {
  for (let attempt = 0; ; attempt++) {
    let nextId = 1
    const cells: (Cell | null)[] = Array(g.w * g.h).fill(null)
    for (const f of fakes) cells[f.index] = { t: "fake", fake: f.fake, hp: f.hp, id: nextId++ }
    for (let i = 0; i < cells.length; i++) {
      if (cells[i]) continue
      cells[i] = { t: "tile", kind: safeKind(g, cells, i, rng), id: nextId++ }
    }
    const b: Board = { g, cells: cells as Cell[], nextId }
    if (hasValidMove(b) || attempt > 50) return b
  }
}

/** Rearrange tiles (fakes stay put) into a playable board. */
export function shuffleBoard(b: Board, rng: Rng): { board: Board; moved: Record<number, number> } {
  const slots = b.cells.map((c, i) => (isTile(c) ? i : -1)).filter((i) => i >= 0)
  for (let attempt = 0; attempt < 200; attempt++) {
    const order = slots.slice()
    for (let k = order.length - 1; k > 0; k--) {
      const j = rng.int(k + 1)
      ;[order[k], order[j]] = [order[j], order[k]]
    }
    const cells = b.cells.slice()
    const moved: Record<number, number> = {}
    slots.forEach((to, k) => { cells[to] = b.cells[order[k]]; if (order[k] !== to) moved[to] = order[k] })
    const out: Board = { g: b.g, cells, nextId: b.nextId }
    if (!findMatches(b.g, cells).length && hasValidMove(out)) return { board: out, moved }
  }
  // Pathological layouts (mostly fakes): rebuild the tiles from scratch.
  const fakes = b.cells.flatMap((c, i) => (c.t === "fake" ? [{ index: i, fake: c.fake, hp: c.hp }] : []))
  const fresh = generateBoard(b.g, rng, fakes)
  return { board: { ...fresh, nextId: Math.max(fresh.nextId, b.nextId) }, moved: {} }
}
