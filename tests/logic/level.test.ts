import { describe, expect, test } from "vitest"
import { isFake, isTile } from "../../src/logic/cells"
import { addFakes, addMoves, applyMove, applyPolice, scoreSteps, starsFor, startLevel, type LevelDef, type LevelState } from "../../src/logic/level"
import { board } from "./helpers"

const def = (over: Partial<LevelDef> = {}): LevelDef => ({
  id: "t-1", chapter: 1, title: "Тест", moves: 10, goals: [{ type: "fakes", n: 1 }],
  initialFakes: [], spreadEvery: 1, interruptEvery: 7, categories: ["bank"],
  stars: [0, 100, 200], specials: [], hint: "", ...over,
})
// A level state on a hand-made board (rows are 7 wide like the real board).
function on(rows: string[], over: Partial<LevelDef> = {}): LevelState {
  const s = startLevel(def(over), 1)
  const { g, cells } = board(rows)
  return { ...s, board: { g, cells, nextId: 500 } }
}
const ROWS = ["0010123", "x212345", "2121012", "3434534", "4545201", "5353152", "1240341", "2402154"]

describe("moves", () => {
  test("an invalid move keeps the state", () => {
    const s = on(ROWS)
    const r = applyMove(s, 0, 7)                     // 0 with fake: invalid
    expect(r.steps).toEqual([])
    expect(r.state.movesLeft).toBe(10)
  })
  test("a valid move spends a move and counts destroyed fakes", () => {
    const s = on(ROWS, { goals: [{ type: "fakes", n: 1 }] })
    const r = applyMove(s, 2, 3)
    expect(r.state.movesLeft).toBe(9)
    expect(r.state.progress[0]).toBeGreaterThanOrEqual(1)
    expect(r.state.status).toBe("won")
  })
  test("running out of moves loses", () => {
    const s = on(ROWS, { moves: 1, goals: [{ type: "fakes", n: 99 }] })
    expect(applyMove(s, 2, 3).state.status).toBe("lost")
  })
  test("collect goals count cleared tiles of the kind", () => {
    const s = on(ROWS, { goals: [{ type: "collect", kind: 0, n: 3 }] })
    expect(applyMove(s, 2, 3).state.progress[0]).toBeGreaterThanOrEqual(3)
  })
})

describe("spreading and interrupts", () => {
  test("fakes spread only on a move that destroyed none", () => {
    const rows = ["0010123", "1212345", "2121012", "3434534", "4545201", "5353152", "1240341", "240215x"]
    const s = on(rows, { goals: [{ type: "fakes", n: 99 }] })
    const r = applyMove(s, 2, 3)
    expect(r.infected).toBeDefined()
    expect(r.state.board.cells.filter(isFake).length).toBe(2)
    const kill = on(ROWS, { goals: [{ type: "fakes", n: 99 }] })
    expect(applyMove(kill, 2, 3).infected).toBeUndefined()
  })
  test("an interrupt is due every interruptEvery moves", () => {
    const s = { ...on(ROWS, { goals: [{ type: "fakes", n: 99 }], interruptEvery: 1 }) }
    expect(applyMove(s, 2, 3).interruptDue).toBe(true)
    const t = on(ROWS, { goals: [{ type: "fakes", n: 99 }], interruptEvery: 7 })
    expect(applyMove(t, 2, 3).interruptDue).toBe(false)
  })
})

describe("boosters and stars", () => {
  test("addMoves and addFakes", () => {
    const s = on(ROWS)
    expect(addMoves(s, 2).movesLeft).toBe(12)
    const r = addFakes(s, 2)
    expect(r.infected).toHaveLength(2)
    expect(r.state.board.cells.filter(isFake).length).toBe(3)
  })
  test("police destroys every fake of the most common type and counts them", () => {
    const rows = ["0x10123", "x212345", "2121012", "3434534", "4545201", "5353152", "1240341", "240215x"]
    const s = on(rows, { goals: [{ type: "fakes", n: 3 }] })
    const tile = s.board.cells.findIndex((c, i) => isTile(c) && i > 20)
    const r = applyPolice(s, tile)
    expect(r.state.board.cells.filter(isFake).length).toBe(0)
    expect(r.state.progress[0]).toBe(3)
    expect(r.state.movesLeft).toBe(10)
  })
  test("stars follow thresholds and a loss gives none", () => {
    const d = def({ stars: [0, 100, 200] })
    expect(starsFor(d, 50, true)).toBe(1)
    expect(starsFor(d, 150, true)).toBe(2)
    expect(starsFor(d, 250, true)).toBe(3)
    expect(starsFor(d, 999, false)).toBe(0)
  })
  test("score grows with cascades and destroyed fakes", () => {
    const s = on(ROWS)
    const r = applyMove(s, 2, 3)
    expect(scoreSteps(r.steps)).toBeGreaterThanOrEqual(9 + 20)
    expect(r.state.score).toBe(scoreSteps(r.steps))
  })
})
