import { FAKE_HP, isFake, isTile } from "./cells"
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
  cells[pick.to] = { t: "fake", fake: src.fake, hp: FAKE_HP[src.fake], id: b.nextId }
  return { board: { g: b.g, cells, nextId: b.nextId + 1 }, infected: pick }
}
