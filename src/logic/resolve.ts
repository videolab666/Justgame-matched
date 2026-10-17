// Cascade loop and column gravity adapted from Rune "Outmatched" (MIT), see NOTICE.
import { isFake, isTile, KINDS, type Cell, type FakeType, type Kind, type Special, type TileCell } from "./cells"
import { areNeighbors, idx, inBounds, rc, type Grid } from "./grid"
import { findMatches, type MatchGroup, type MatchShape } from "./match"
import type { Rng } from "./rng"

export type Board = { g: Grid; cells: Cell[]; nextId: number }
export type Rules = { specials: Set<"row" | "col" | "notify" | "kep"> }

/** One cascade step, in the order the renderer plays it. */
export type Step = {
  matched: MatchGroup[]
  cleared: number[]
  clearedKinds: Kind[]                               // kind of each cleared cell, same order
  created: { index: number; special: Special; kind: Kind; id: number }[]
  fired: { index: number; special: Special; area: number[] }[]
  fakesHit: { index: number; destroyed: boolean; revealed?: boolean }[]
  moved: Record<number, number>
  added: Record<number, Cell>
}

const SHAPE_SPECIAL: Partial<Record<MatchShape, "row" | "col" | "notify" | "kep">> = {
  line4h: "row", line4v: "col", lt: "notify", line5: "kep",
}

type Work = { g: Grid; cells: (Cell | null)[]; nextId: number }
type Fire = { index: number; cell: TileCell; targetKind?: Kind }

function swapped(b: Board, a: number, c: number): Cell[] {
  const cells = b.cells.slice()
  ;[cells[a], cells[c]] = [cells[c], cells[a]]
  return cells
}

export function isValidSwap(b: Board, a: number, c: number): boolean {
  if (!areNeighbors(b.g, a, c)) return false
  const x = b.cells[a], y = b.cells[c]
  if (!isTile(x) || !isTile(y)) return false
  if (x.special === "kep" || y.special === "kep") return true
  return findMatches(b.g, swapped(b, a, c)).length > 0
}

/** Cells a special clears. Geometry only; protected cells are filtered later. */
function areaOf(w: Work, f: Fire): number[] {
  const { g, cells } = w
  const { r, c } = rc(g, f.index)
  switch (f.cell.special) {
    case "row": return Array.from({ length: g.w }, (_, k) => idx(g, r, k))
    case "col": return Array.from({ length: g.h }, (_, k) => idx(g, k, c))
    case "notify": {
      const out: number[] = []
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (inBounds(g, r + dr, c + dc)) out.push(idx(g, r + dr, c + dc))
      }
      return out
    }
    case "kep": {
      const kind = f.targetKind ?? f.cell.kind
      const out = [f.index]
      cells.forEach((x, i) => { if (isTile(x) && x.kind === kind && i !== f.index) out.push(i) })
      return out
    }
    case "police": {
      const count = new Map<FakeType, number>()
      for (const x of cells) if (isFake(x)) count.set(x.fake, (count.get(x.fake) ?? 0) + 1)
      const top = [...count.entries()].sort((p, q) => q[1] - p[1])[0]?.[0]
      const out = [f.index]
      cells.forEach((x, i) => { if (isFake(x) && x.fake === top) out.push(i) })
      return out
    }
    default: return [f.index]
  }
}

/** Column gravity (cells fall into gaps) and refill from above. */
function settle(w: Work, rng: Rng): { moved: Record<number, number>; added: Record<number, Cell> } {
  const { g, cells } = w
  const moved: Record<number, number> = {}
  const added: Record<number, Cell> = {}
  for (let c = 0; c < g.w; c++) {
    let write = g.h - 1
    for (let r = g.h - 1; r >= 0; r--) {
      const from = idx(g, r, c)
      if (cells[from] === null) continue
      const to = idx(g, write, c)
      if (to !== from) { cells[to] = cells[from]; cells[from] = null; moved[to] = from }
      write--
    }
    for (let r = write; r >= 0; r--) {
      const i = idx(g, r, c)
      const cell: Cell = { t: "tile", kind: rng.int(KINDS) as Kind, id: w.nextId++ }
      cells[i] = cell
      added[i] = cell
    }
  }
  return { moved, added }
}

function step(w: Work, rng: Rng, rules: Rules, pending: Fire[], swapCells: number[]): Step | null {
  const { g, cells } = w
  const matched = findMatches(g, cells)
  if (!matched.length && !pending.length) return null

  const clear = new Set<number>()
  const protect = new Set<number>()
  const created: Step["created"] = []
  for (const m of matched) {
    m.cells.forEach((i) => clear.add(i))
    const special = SHAPE_SPECIAL[m.shape]
    if (!special || !rules.specials.has(special)) continue
    const preferred = swapCells.filter((i) => m.cells.includes(i))
    const middle = m.cells[Math.floor(m.cells.length / 2)]
    const pos = [...preferred, middle, ...m.cells].find((i) => {
      const x = cells[i]
      return isTile(x) && !x.special && !protect.has(i)
    })
    if (pos === undefined) continue
    const old = cells[pos] as TileCell
    cells[pos] = { ...old, special }
    protect.add(pos)
    created.push({ index: pos, special, kind: old.kind, id: old.id })
  }

  // Specials inside the cleared set fire, and their blasts can chain.
  const fired: Step["fired"] = []
  const queue = [...pending]
  for (const i of clear) {
    const x = cells[i]
    if (isTile(x) && x.special && !protect.has(i)) queue.push({ index: i, cell: x })
  }
  const firedAt = new Set<number>()
  const blastHit = new Set<number>()
  while (queue.length) {
    const f = queue.shift()!
    if (firedAt.has(f.index)) continue
    firedAt.add(f.index)
    const area = areaOf(w, f)
    fired.push({ index: f.index, special: f.cell.special!, area })
    clear.add(f.index)
    for (const i of area) {
      const x = cells[i]
      if (protect.has(i)) continue
      if (isFake(x)) { blastHit.add(i); continue }
      if (!isTile(x)) continue
      clear.add(i)
      if (x.special && !firedAt.has(i)) queue.push({ index: i, cell: x })
    }
  }

  // Fakes: hit once per step when next to a matched cell or inside a blast.
  const hit = new Set(blastHit)
  for (const m of matched) for (const i of m.cells) {
    const { r, c } = rc(g, i)
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      if (!inBounds(g, r + dr, c + dc)) continue
      const j = idx(g, r + dr, c + dc)
      if (isFake(cells[j])) hit.add(j)
    }
  }
  const fakesHit: Step["fakesHit"] = []
  for (const i of [...hit].sort((a, b) => a - b)) {
    const x = cells[i]
    if (!isFake(x)) continue
    if (x.fake === "forgery" && !x.revealed) {
      cells[i] = { ...x, revealed: true }
      fakesHit.push({ index: i, destroyed: false, revealed: true })
      continue
    }
    const hp = x.hp - 1
    if (hp <= 0) { cells[i] = null; fakesHit.push({ index: i, destroyed: true }) }
    else { cells[i] = { ...x, hp }; fakesHit.push({ index: i, destroyed: false }) }
  }

  const cleared = [...clear].filter((i) => !protect.has(i) && isTile(cells[i])).sort((a, b) => a - b)
  const clearedKinds = cleared.map((i) => (cells[i] as TileCell).kind)
  for (const i of cleared) cells[i] = null
  const { moved, added } = settle(w, rng)
  return { matched, cleared, clearedKinds, created, fired, fakesHit, moved, added }
}

function cascade(w: Work, rng: Rng, rules: Rules, first: Fire[], swapCells: number[]): Step[] {
  const steps: Step[] = []
  let pending = first
  for (let guard = 0; guard < 60; guard++) {
    const s = step(w, rng, rules, pending, guard === 0 ? swapCells : [])
    if (!s) break
    steps.push(s)
    pending = []
  }
  return steps
}

/** Swap two neighbours and resolve all cascades. An invalid swap returns the
 * same board and no steps. */
export function resolveSwap(b: Board, a: number, c: number, rng: Rng, rules: Rules): { board: Board; steps: Step[] } {
  if (!isValidSwap(b, a, c)) return { board: b, steps: [] }
  const w: Work = { g: b.g, cells: swapped(b, a, c), nextId: b.nextId }
  const x = w.cells[a] as TileCell, y = w.cells[c] as TileCell
  const first: Fire[] = []
  // KEP swapped with a tile clears every tile of that tile's kind.
  if (x.special === "kep") first.push({ index: a, cell: x, targetKind: y.kind })
  else if (y.special === "kep") first.push({ index: c, cell: y, targetKind: x.kind })
  const steps = cascade(w, rng, rules, first, [c, a])
  return { board: { g: b.g, cells: w.cells as Cell[], nextId: w.nextId }, steps }
}

/** Fire the special tile at `i` (boosters) and resolve the cascades. */
export function fireSpecialAt(b: Board, i: number, rng: Rng, rules: Rules): { board: Board; steps: Step[] } {
  const cell = b.cells[i]
  if (!isTile(cell) || !cell.special) return { board: b, steps: [] }
  const w: Work = { g: b.g, cells: b.cells.slice(), nextId: b.nextId }
  const steps = cascade(w, rng, rules, [{ index: i, cell }], [])
  return { board: { g: b.g, cells: w.cells as Cell[], nextId: w.nextId }, steps }
}
