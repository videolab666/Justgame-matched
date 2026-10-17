import { describe, expect, test } from "vitest"
import { makeRng } from "../../src/logic/rng"
import { areNeighbors, idx, neighbors4, rc } from "../../src/logic/grid"

const g = { w: 7, h: 8 }

describe("rng", () => {
  test("same seed repeats, other seed differs", () => {
    const a = makeRng(1), b = makeRng(1), c = makeRng(2)
    const sa = [a.next(), a.next(), a.next()]
    expect([b.next(), b.next(), b.next()]).toEqual(sa)
    expect([c.next(), c.next(), c.next()]).not.toEqual(sa)
  })
  test("int stays in range", () => {
    const r = makeRng(7)
    for (let i = 0; i < 1000; i++) {
      const v = r.int(6)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(6)
    }
  })
  test("state restores the sequence", () => {
    const r = makeRng(5)
    r.next()
    const resumed = makeRng(r.state())
    expect(resumed.next()).toBe(r.next())
  })
})

describe("grid", () => {
  test("index and coordinates round-trip", () => {
    expect(idx(g, 2, 3)).toBe(17)
    expect(rc(g, 17)).toEqual({ r: 2, c: 3 })
  })
  test("neighbour counts at corner, edge and inside", () => {
    expect(neighbors4(g, 0)).toHaveLength(2)
    expect(neighbors4(g, 3)).toHaveLength(3)
    expect(neighbors4(g, idx(g, 3, 3))).toHaveLength(4)
  })
  test("no neighbours across a row wrap", () => {
    expect(areNeighbors(g, 6, 7)).toBe(false)
    expect(areNeighbors(g, 5, 6)).toBe(true)
    expect(areNeighbors(g, 0, 7)).toBe(true)
    expect(areNeighbors(g, 0, 8)).toBe(false)
  })
})
