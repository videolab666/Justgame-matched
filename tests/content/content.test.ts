import { describe, expect, test } from "vitest"
import { pickScam } from "../../src/content/deck"
import { CHAPTER1 } from "../../src/content/levels"
import { SCAMS } from "../../src/content/scams"
import type { Audience } from "../../src/content/types"
import { makeRng } from "../../src/logic/rng"

const CH1_CATEGORIES = [...new Set(CHAPTER1.flatMap((l) => l.categories))]

describe("levels", () => {
  test("chapter 1 definitions are sane", () => {
    expect(CHAPTER1).toHaveLength(6)
    for (const l of CHAPTER1) {
      expect(l.moves, l.id).toBeGreaterThan(0)
      expect(l.goals.length, l.id).toBeGreaterThan(0)
      const idx = l.initialFakes.map((f) => f.index)
      expect(new Set(idx).size, l.id).toBe(idx.length)
      for (const i of idx) expect(i, l.id).toBeLessThan(56)
      expect(l.stars[0] < l.stars[1] && l.stars[1] < l.stars[2], l.id).toBe(true)
      const fakeGoal = l.goals.find((g) => g.type === "fakes")
      if (fakeGoal) expect(fakeGoal.n, l.id).toBeGreaterThanOrEqual(l.initialFakes.length)
      expect(l.hint.length, l.id).toBeGreaterThan(10)
    }
  })
})

describe("scams", () => {
  test("ids are unique", () => {
    expect(new Set(SCAMS.map((s) => s.id)).size).toBe(SCAMS.length)
  })
  test("fakes carry flags found in the sender or text, real ones carry none", () => {
    for (const s of SCAMS) {
      if (s.isFake) {
        expect(s.flags.length, s.id).toBeGreaterThan(0)
        for (const f of s.flags) expect((s.sender + " " + s.text).includes(f), `${s.id}: ${f}`).toBe(true)
      } else expect(s.flags, s.id).toEqual([])
      expect(s.explain.length, s.id).toBeGreaterThan(20)
    }
  })
  test("about 60 % are fakes", () => {
    const share = SCAMS.filter((s) => s.isFake).length / SCAMS.length
    expect(share).toBeGreaterThan(0.5)
    expect(share).toBeLessThan(0.75)
  })
  test("every audience has at least 12 scenarios in chapter-1 categories", () => {
    for (const a of ["self", "parents", "kids"] as Audience[]) {
      const n = SCAMS.filter((s) => s.audience.includes(a) && CH1_CATEGORIES.includes(s.category)).length
      expect(n, a).toBeGreaterThanOrEqual(12)
    }
  })
  test("fake messages never name real banks", () => {
    const banned = /ПриватБанк|Приватбанк|Монобанк|monobank|privatbank\.ua|Ощадбанк|oschadbank|ПУМБ|Райффайзен/i
    for (const s of SCAMS.filter((x) => x.isFake)) expect(banned.test(s.text + s.sender), s.id).toBe(false)
  })
})

describe("deck", () => {
  test("no repeats until the pool is exhausted, then it starts over", () => {
    const rng = makeRng(3)
    const cats = CHAPTER1[0].categories
    const pool = SCAMS.filter((s) => s.audience.includes("kids") && cats.includes(s.category))
    let seen: string[] = []
    const got: string[] = []
    for (let k = 0; k < pool.length; k++) {
      const r = pickScam(seen, "kids", cats, rng)
      seen = r.seen
      got.push(r.scam.id)
    }
    expect(new Set(got).size).toBe(pool.length)
    const again = pickScam(seen, "kids", cats, rng)
    expect(pool.map((s) => s.id)).toContain(again.scam.id)
    expect(again.seen).toHaveLength(1)
  })
})
