// Run scanning and cluster merging adapted from Rune "Outmatched" (MIT), see NOTICE.
import { isTile, type Cell, type Kind } from "./cells"
import { idx, type Grid } from "./grid"

export type MatchShape = "line3" | "line4h" | "line4v" | "line5" | "lt"
export type MatchGroup = { cells: number[]; kind: Kind; shape: MatchShape }

type Run = { cells: number[]; horizontal: boolean }

function runs(g: Grid, cells: (Cell | null)[], horizontal: boolean): Run[] {
  const out: Run[] = []
  const outer = horizontal ? g.h : g.w, inner = horizontal ? g.w : g.h
  for (let a = 0; a < outer; a++) {
    let run: number[] = []
    let kind = -1
    const flush = () => { if (run.length >= 3) out.push({ cells: run, horizontal }) }
    for (let b = 0; b < inner; b++) {
      const i = horizontal ? idx(g, a, b) : idx(g, b, a)
      const c = cells[i]
      if (isTile(c) && c.kind === kind) run.push(i)
      else { flush(); run = isTile(c) ? [i] : []; kind = isTile(c) ? c.kind : -1 }
    }
    flush()
  }
  return out
}

/** All matches on the board. Runs that share a cell (L/T/+) merge into one
 * group; a run of five or more wins over the L/T shape. */
export function findMatches(g: Grid, cells: (Cell | null)[]): MatchGroup[] {
  const all = [...runs(g, cells, true), ...runs(g, cells, false)]
  const groups: Run[][] = []
  for (const run of all) {
    const touching = groups.filter((grp) => grp.some((r) => r.cells.some((i) => run.cells.includes(i))))
    const merged = [run, ...touching.flat()]
    for (const t of touching) groups.splice(groups.indexOf(t), 1)
    groups.push(merged)
  }
  return groups.map((grp) => {
    const set = [...new Set(grp.flatMap((r) => r.cells))].sort((a, b) => a - b)
    const longest = Math.max(...grp.map((r) => r.cells.length))
    const both = grp.some((r) => r.horizontal) && grp.some((r) => !r.horizontal)
    const shape: MatchShape =
      longest >= 5 ? "line5"
      : both ? "lt"
      : longest === 4 ? (grp[0].horizontal ? "line4h" : "line4v")
      : "line3"
    const first = cells[set[0]]
    return { cells: set, kind: (isTile(first) ? first.kind : 0) as Kind, shape }
  })
}
