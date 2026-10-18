import { isTile, type Special } from "./cells"
import { rulesOf, scoreSteps, type LevelState } from "./level"
import { fireSpecialAt, type Board, type Step } from "./resolve"
import { makeRng, type Rng } from "./rng"

export type BoosterKind = "row" | "notify" | "kep" | "moves"
export type Boosters = Record<BoosterKind, number>

/** Fortune-wheel segments (clockwise from the top). "jackpot" = one of each. */
export const WHEEL: { prize: BoosterKind | "jackpot"; label: string; weight: number }[] = [
  { prize: "row", label: "2FA", weight: 18 },
  { prize: "moves", label: "+3 ходи", weight: 18 },
  { prize: "notify", label: "Сповіщення", weight: 14 },
  { prize: "row", label: "2FA", weight: 18 },
  { prize: "kep", label: "КЕП", weight: 8 },
  { prize: "moves", label: "+3 ходи", weight: 18 },
  { prize: "notify", label: "Сповіщення", weight: 14 },
  { prize: "jackpot", label: "ДЖЕКПОТ", weight: 4 },
]

export function spinWheel(rng: Rng): number {
  const total = WHEEL.reduce((a, w) => a + w.weight, 0)
  let x = rng.next() * total
  for (let i = 0; i < WHEEL.length; i++) { x -= WHEEL[i].weight; if (x < 0) return i }
  return WHEEL.length - 1
}

const plainTiles = (s: LevelState) => s.board.cells.map((c, i) => (isTile(c) && !c.special ? i : -1)).filter((i) => i >= 0)

/** «Бонус-фінал»: every remaining move (at most `max`) turns a random tile
 * into a 2FA that fires at once; +60 per move on top of the blast score. */
export function finaleRounds(s: LevelState, max = 12) {
  const rng = makeRng(s.rngState)
  const rules = rulesOf(s.def)
  let state = s
  const rounds: { at: number; special: Special; before: Board; steps: Step[]; after: Board; bonus: number }[] = []
  const n = Math.min(s.movesLeft, max)
  for (let k = 0; k < n; k++) {
    const tiles = plainTiles(state)
    if (!tiles.length) break
    const at = tiles[rng.int(tiles.length)]
    const special: Special = k % 2 ? "col" : "row"
    const cells = state.board.cells.slice()
    const c = cells[at]
    if (!isTile(c)) break
    cells[at] = { ...c, special }
    const before = { ...state.board, cells }
    const { board, steps } = fireSpecialAt(before, at, rng, rules)
    const bonus = 60 + scoreSteps(steps)
    state = { ...state, board, score: state.score + bonus, movesLeft: state.movesLeft - 1 }
    rounds.push({ at, special, before, steps, after: board, bonus })
  }
  state = { ...state, movesLeft: Math.max(0, state.movesLeft - (n - rounds.length)), rngState: rng.state() }
  if (s.movesLeft > max) state = { ...state, movesLeft: 0 }
  return { state, rounds }
}

/** Boosters chosen before a level: specials on random plain tiles, +3 moves. */
export function applyBoosters(s: LevelState, picks: BoosterKind[], seed: number): { state: LevelState; placed: number[] } {
  const rng = makeRng(seed)
  const cells = s.board.cells.slice()
  const placed: number[] = []
  let movesLeft = s.movesLeft
  for (const p of picks) {
    if (p === "moves") { movesLeft += 3; continue }
    const free = cells.map((c, i) => (isTile(c) && !c.special ? i : -1)).filter((i) => i >= 0)
    if (!free.length) continue
    const at = free[rng.int(free.length)]
    const c = cells[at]
    if (!isTile(c)) continue
    cells[at] = { ...c, special: p }
    placed.push(at)
  }
  return { state: { ...s, movesLeft, board: { ...s.board, cells } }, placed }
}
