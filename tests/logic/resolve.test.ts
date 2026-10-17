import { describe, expect, test } from "vitest"
import { isFake, isTile } from "../../src/logic/cells"
import { idx } from "../../src/logic/grid"
import { makeRng } from "../../src/logic/rng"
import { fireSpecialAt, isValidSwap, resolveSwap, type Board, type Rules } from "../../src/logic/resolve"
import { board } from "./helpers"

const ALL: Rules = { specials: new Set(["row", "col", "notify", "kep"]) }
const NONE: Rules = { specials: new Set() }
const mk = (rows: string[]): Board => { const { g, cells } = board(rows); return { g, cells, nextId: 1000 } }
const full = (b: Board) => b.cells.every((c) => c && (isTile(c) || isFake(c)))

describe("swap validity", () => {
  test("a swap that makes a line is valid, one that does not is invalid", () => {
    const b = mk(["0102", "1213", "2324"])
    expect(isValidSwap(b, 0, 4)).toBe(false)        // 0<->1 vertical makes nothing
    const c = mk(["0010", "1212", "2121"])
    expect(isValidSwap(c, 2, 3)).toBe(true)          // ..0 1 -> 0 0 0 1
  })
  test("fakes cannot be swapped and non-neighbours are invalid", () => {
    const b = mk(["00x0", "1212", "2121"])
    expect(isValidSwap(b, 2, 3)).toBe(false)
    expect(isValidSwap(b, 0, 5)).toBe(false)
  })
})

describe("resolution", () => {
  test("a three-match clears 3 cells and the board is refilled", () => {
    const b = mk(["0010", "1212", "2121", "3434"])
    const { board: out, steps } = resolveSwap(b, 2, 3, makeRng(3), NONE)
    expect(steps[0].cleared.sort((a, c) => a - c)).toEqual([0, 1, 2])
    expect(full(out)).toBe(true)
    expect(Object.keys(steps[0].added)).toHaveLength(3)
  })
  test("invalid swap changes nothing", () => {
    const b = mk(["0102", "1213", "2324"])
    const r = resolveSwap(b, 0, 4, makeRng(1), ALL)
    expect(r.steps).toHaveLength(0)
    expect(r.board).toBe(b)
  })
  test("four in a row creates a row special at the swapped cell", () => {
    const b = mk(["00010", "12121", "21212", "34343"])
    const { steps } = resolveSwap(b, 3, 4, makeRng(1), ALL)
    expect(steps[0].created).toEqual([expect.objectContaining({ index: 3, special: "row", kind: 0 })])
    expect(steps[0].cleared).not.toContain(3)
  })
  test("with no specials allowed four tiles are simply cleared", () => {
    const b = mk(["00010", "12121", "21212", "34343"])
    const { steps } = resolveSwap(b, 3, 4, makeRng(1), NONE)
    expect(steps[0].created).toEqual([])
    expect(steps[0].cleared).toHaveLength(4)
  })
  test("a row special clears its whole row when matched", () => {
    const b = mk(["R0010", "12121", "21212", "34343", "43434"])
    const { steps } = resolveSwap(b, 3, 4, makeRng(1), ALL)
    const fired = steps[0].fired.find((f) => f.special === "row")!
    expect(fired.area.sort((a, c) => a - c)).toEqual([0, 1, 2, 3, 4])
    expect(steps[0].cleared).toContain(4)                       // blast reaches past the match
    expect(steps[0].created[0].index).toBe(3)                    // a special made this step survives
  })
  test("notify at a corner clears the clipped 3x3", () => {
    const b = mk(["N1212", "21212", "12121", "34343"])
    const { steps } = fireSpecialAt(b, 0, makeRng(1), ALL)
    expect(steps[0].fired[0].area.sort((a, c) => a - c)).toEqual([0, 1, 5, 6])
  })
  test("a fake next to a match is hit and destroyed", () => {
    const b = mk(["0010", "x212", "2121", "3434"])
    const { steps } = resolveSwap(b, 2, 3, makeRng(2), NONE)
    expect(steps[0].fakesHit).toEqual([{ index: 4, destroyed: true }])
  })
  test("a two-hp fake survives one hit", () => {
    const b = mk(["0010", "X212", "2121", "3434"])
    const { board: out, steps } = resolveSwap(b, 2, 3, makeRng(2), NONE)
    expect(steps[0].fakesHit).toEqual([{ index: 4, destroyed: false }])
    expect(out.cells.some((c) => isFake(c) && c.hp === 1)).toBe(true)
  })
  test("a fake inside a row blast is hit", () => {
    const b = mk(["R001x", "12121", "21212", "34343"])
    const { steps } = fireSpecialAt(b, 0, makeRng(1), ALL)
    expect(steps[0].fakesHit).toContainEqual({ index: 4, destroyed: true })
  })
  test("kep swapped with a tile clears every tile of that kind", () => {
    const b = mk(["K1212", "21212", "12121", "34343"])
    const ones = b.cells.filter((c) => isTile(c) && c.kind === 1).length
    const { steps } = resolveSwap(b, 0, 1, makeRng(1), ALL)
    expect(steps[0].fired[0].special).toBe("kep")
    expect(steps[0].cleared.length).toBeGreaterThanOrEqual(ones)
  })
  test("cascades happen on some seeds and the board always ends full and stable", () => {
    const rows = ["0010", "1212", "2121", "3434", "4545", "5353"]
    let cascades = 0
    for (let seed = 1; seed <= 200; seed++) {
      const { board: out, steps } = resolveSwap(mk(rows), 2, 3, makeRng(seed), ALL)
      expect(full(out)).toBe(true)
      if (steps.length > 1) cascades++
    }
    expect(cascades).toBeGreaterThan(0)
  })
  test("gravity records moves from above", () => {
    const b = mk(["1212", "0010", "2121", "3434"])
    const { steps } = resolveSwap(b, 6, 7, makeRng(4), NONE)
    expect(steps[0].moved[idx(b.g, 1, 0)]).toBe(idx(b.g, 0, 0))
  })
})
