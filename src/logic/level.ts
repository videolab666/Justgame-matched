import type { ScamCategory } from "../content/types"
import { FAKE_HP, isFake, isTile, type FakeType, type Kind } from "./cells"
import { hopCalls, spreadFake } from "./fakes"
import { generateBoard, hasValidMove, shuffleBoard, type FakeSeed } from "./generate"
import type { Grid } from "./grid"
import { fireSpecialAt, resolveSwap, type Board, type Rules, type Step } from "./resolve"
import { makeRng } from "./rng"

export const BOARD: Grid = { w: 7, h: 8 }

export type Goal = { type: "fakes"; n: number } | { type: "collect"; kind: Kind; n: number }
export type LevelDef = {
  id: string
  chapter: 1 | 2 | 3 | 4
  title: string
  moves: number
  goals: Goal[]
  initialFakes: FakeSeed[]
  spreadEvery: number
  interruptEvery: number
  categories: ScamCategory[]
  stars: [number, number, number]
  specials: ("row" | "col" | "notify" | "kep")[]
  /** Swapping two specials fires a combo (chapter 4). */
  combos?: boolean
  /** Seconds for a timed round («Справа дня»); moves are then unlimited. */
  timeLimit?: number
  hint: string
}
export type LevelState = {
  def: LevelDef
  board: Board
  rngState: number
  movesLeft: number
  moveCount: number
  score: number
  progress: number[]
  status: "playing" | "won" | "lost"
}
export type MoveResult = {
  state: LevelState
  steps: Step[]
  infected?: { from: number; to: number }
  hops?: { from: number; to: number }[]
  shuffled?: Record<number, number>
  interruptDue: boolean
}

const rulesOf = (def: LevelDef): Rules => ({ specials: new Set(def.specials), combos: !!def.combos })

export function startLevel(def: LevelDef, seed: number): LevelState {
  const rng = makeRng(seed)
  const board = generateBoard(BOARD, rng, def.initialFakes)
  return {
    def, board, rngState: rng.state(), movesLeft: def.moves, moveCount: 0, score: 0,
    progress: def.goals.map(() => 0), status: "playing",
  }
}

/** Score: Σ group size² growing by half per cascade, +3 per blast cell,
 * +20 per destroyed fake. */
export function scoreSteps(steps: Step[]): number {
  let total = 0
  steps.forEach((s, k) => {
    const groups = s.matched.reduce((a, m) => a + m.cells.length ** 2, 0)
    total += Math.round(groups * (1 + k * 0.5))
    total += 3 * s.fired.reduce((a, f) => a + f.area.length, 0)
    total += 20 * s.fakesHit.filter((h) => h.destroyed).length
  })
  return total
}

const destroyedIn = (steps: Step[]) => steps.reduce((a, s) => a + s.fakesHit.filter((h) => h.destroyed).length, 0)

function account(s: LevelState, steps: Step[]): LevelState {
  const progress = s.def.goals.map((goal, k) => {
    const got = goal.type === "fakes"
      ? destroyedIn(steps)
      : steps.reduce((a, st) => a + st.clearedKinds.filter((x) => x === goal.kind).length, 0)
    return Math.min(goal.n, s.progress[k] + got)
  })
  return { ...s, progress, score: s.score + scoreSteps(steps) }
}

const goalsDone = (s: LevelState) => s.def.goals.every((g, k) => s.progress[k] >= g.n)

function finish(s: LevelState): LevelState {
  if (goalsDone(s)) return { ...s, status: "won" }
  if (s.movesLeft <= 0) return { ...s, status: "lost" }
  return s
}

export function applyMove(s: LevelState, a: number, b: number): MoveResult {
  if (s.status !== "playing") return { state: s, steps: [], interruptDue: false }
  const rng = makeRng(s.rngState)
  const { board, steps } = resolveSwap(s.board, a, b, rng, rulesOf(s.def))
  if (!steps.length) return { state: s, steps: [], interruptDue: false }
  let state = account({ ...s, board, movesLeft: s.movesLeft - 1, moveCount: s.moveCount + 1 }, steps)
  let infected: MoveResult["infected"]
  const anyFake = state.board.cells.some(isFake)
  if (!goalsDone(state) && anyFake && destroyedIn(steps) === 0 && state.moveCount % s.def.spreadEvery === 0) {
    const spread = spreadFake(state.board, rng)
    state = { ...state, board: spread.board }
    infected = spread.infected
  }
  let hops: MoveResult["hops"]
  if (!goalsDone(state) && state.board.cells.some((c) => isFake(c) && c.fake === "call")) {
    const h = hopCalls(state.board, rng)
    state = { ...state, board: h.board }
    if (h.hops.length) hops = h.hops
  }
  let shuffled: MoveResult["shuffled"]
  if (!hasValidMove(state.board)) {
    const sh = shuffleBoard(state.board, rng)
    state = { ...state, board: sh.board }
    shuffled = sh.moved
  }
  state = finish({ ...state, rngState: rng.state() })
  const interruptDue = state.status === "playing" && s.def.interruptEvery > 0 && state.moveCount % s.def.interruptEvery === 0
  return { state, steps, infected, hops, shuffled, interruptDue }
}

/** «Кіберполіція» booster: turns the tile at `index` into a police special
 * and fires it (all fakes of the most common type). Costs no move. */
export function applyPolice(s: LevelState, index: number): { state: LevelState; steps: Step[] } {
  const cell = s.board.cells[index]
  if (!isTile(cell)) return { state: s, steps: [] }
  const rng = makeRng(s.rngState)
  const cells = s.board.cells.slice()
  cells[index] = { ...cell, special: "police" }
  const { board, steps } = fireSpecialAt({ ...s.board, cells }, index, rng, rulesOf(s.def))
  const state = finish(account({ ...s, board, rngState: rng.state() }, steps))
  return { state, steps }
}

/** Penalty for a wrong scam answer: `n` plain tiles turn into fakes. */
export function addFakes(s: LevelState, n: number): { state: LevelState; infected: number[] } {
  const rng = makeRng(s.rngState)
  const counts = new Map<FakeType, number>()
  for (const c of s.board.cells) if (isFake(c)) counts.set(c.fake, (counts.get(c.fake) ?? 0) + 1)
  const type: FakeType = [...counts.entries()].sort((p, q) => q[1] - p[1])[0]?.[0] ?? "sms"
  const cells = s.board.cells.slice()
  let nextId = s.board.nextId
  const plain = cells.map((c, i) => (isTile(c) && !c.special ? i : -1)).filter((i) => i >= 0)
  const infected: number[] = []
  for (let k = 0; k < n && plain.length; k++) {
    const i = plain.splice(rng.int(plain.length), 1)[0]
    const victim = cells[i]
    cells[i] = type === "forgery" && isTile(victim)
      ? { t: "fake", fake: "forgery", hp: FAKE_HP.forgery, id: nextId++, disguise: victim.kind, revealed: false }
      : { t: "fake", fake: type, hp: FAKE_HP[type], id: nextId++ }
    infected.push(i)
  }
  return { state: { ...s, board: { ...s.board, cells, nextId }, rngState: rng.state() }, infected }
}

export const addMoves = (s: LevelState, n: number): LevelState => ({ ...s, movesLeft: s.movesLeft + n })

export function starsFor(def: LevelDef, score: number, won: boolean): 0 | 1 | 2 | 3 {
  if (!won) return 0
  return score >= def.stars[2] ? 3 : score >= def.stars[1] ? 2 : 1
}
