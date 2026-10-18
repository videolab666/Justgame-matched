import { expect, test } from "vitest"
import { applyBoosters, finaleRounds, spinWheel, WHEEL } from "../../src/logic/bonus"
import { isFake, isTile } from "../../src/logic/cells"
import { startLevel, type LevelDef } from "../../src/logic/level"
import { makeRng } from "../../src/logic/rng"

const def: LevelDef = {
  id: "t", chapter: 1, title: "t", moves: 10, goals: [{ type: "fakes", n: 1 }],
  initialFakes: [{ index: 30, fake: "sms", hp: 1 }], spreadEvery: 3, interruptEvery: 6,
  categories: ["bank"], stars: [0, 100, 200], specials: ["row", "col"], hint: "",
}

test("the finale spends every remaining move (up to 12) and adds score", () => {
  const s = { ...startLevel(def, 4), status: "won" as const, movesLeft: 5 }
  const r = finaleRounds(s)
  expect(r.rounds).toHaveLength(5)
  expect(r.state.movesLeft).toBe(0)
  expect(r.state.score).toBeGreaterThan(s.score + 5 * 60)
  for (const round of r.rounds) expect(round.steps.length).toBeGreaterThan(0)
  const big = finaleRounds({ ...s, movesLeft: 30 })
  expect(big.rounds).toHaveLength(12)
})

test("boosters put specials on plain tiles and add moves", () => {
  const s = startLevel(def, 7)
  const r = applyBoosters(s, ["row", "notify", "kep", "moves"], 3)
  expect(r.state.movesLeft).toBe(13)
  expect(r.placed).toHaveLength(3)
  const specials = r.placed.map((i) => r.state.board.cells[i]).map((c) => (isTile(c) ? c.special : undefined))
  expect(specials.sort()).toEqual(["kep", "notify", "row"])
  expect(r.state.board.cells.filter(isFake).length).toBe(1)
})

test("the wheel only returns valid segments and every segment can win", () => {
  const rng = makeRng(9)
  const seen = new Set<number>()
  for (let k = 0; k < 2000; k++) {
    const i = spinWheel(rng)
    expect(i).toBeGreaterThanOrEqual(0)
    expect(i).toBeLessThan(WHEEL.length)
    seen.add(i)
  }
  expect(seen.size).toBe(WHEEL.length)
})
