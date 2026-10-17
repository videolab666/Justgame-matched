import { FAKE_HP, isFake, isTile, type Cell } from "./cells"
import { neighbors4 } from "./grid"
import type { Board } from "./resolve"
import type { Rng } from "./rng"

/** A fake infects one neighbouring plain tile (specials are immune). */
export function spreadFake(b: Board, rng: Rng): { board: Board; infected?: { from: number; to: number } } {
  const options: { from: number; to: number }[] = []
  b.cells.forEach((c, i) => {
    if (!isFake(c)) return
    for (const j of neighbors4(b.g, i)) {
      const n = b.cells[j]
      if (isTile(n) && !n.special) options.push({ from: i, to: j })
    }
  })
  if (!options.length) return { board: b }
  const pick = options[rng.int(options.length)]
  const src = b.cells[pick.from]
  if (!isFake(src)) return { board: b }
  const cells = b.cells.slice()
  const victim = b.cells[pick.to]
  cells[pick.to] = src.fake === "forgery" && isTile(victim)
    ? { t: "fake", fake: "forgery", hp: FAKE_HP.forgery, id: b.nextId, disguise: victim.kind, revealed: false }
    : { t: "fake", fake: src.fake, hp: FAKE_HP[src.fake], id: b.nextId }
  return { board: { g: b.g, cells, nextId: b.nextId + 1 }, infected: pick }
}

/** «Дзвінок» fakes move: each swaps places with a random plain neighbour
 * tile (the tile takes the call's old cell). Boxed-in calls stay. */
export function hopCalls(b: Board, rng: Rng): { board: Board; hops: { from: number; to: number }[] } {
  const cells: Cell[] = b.cells.slice()
  const hops: { from: number; to: number }[] = []
  const callIds = b.cells.filter((c) => isFake(c) && c.fake === "call").map((c) => c.id)
  for (const id of callIds) {
    const from = cells.findIndex((c) => c.id === id)
    const options = neighbors4(b.g, from).filter((j) => { const n = cells[j]; return isTile(n) && !n.special })
    if (!options.length) continue
    const to = options[rng.int(options.length)]
    ;[cells[from], cells[to]] = [cells[to], cells[from]]
    hops.push({ from, to })
  }
  return { board: { ...b, cells }, hops }
}
