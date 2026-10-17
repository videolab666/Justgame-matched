import { expect, test } from "vitest"
import { dailyKey, dailyLevel, shareText, updateStreak } from "../../src/content/daily"
import { startLevel } from "../../src/logic/level"

test("the daily key is the local calendar date", () => {
  expect(dailyKey(new Date(2026, 9, 18, 23, 59))).toBe("2026-10-18")
  expect(dailyKey(new Date(2026, 0, 5, 0, 1))).toBe("2026-01-05")
})

test("same day gives the same board, another day a different one", () => {
  const a = dailyLevel("2026-10-18"), b = dailyLevel("2026-10-18"), c = dailyLevel("2026-10-19")
  expect(a.seed).toBe(b.seed)
  expect(startLevel(a.def, a.seed).board.cells).toEqual(startLevel(b.def, b.seed).board.cells)
  expect(c.seed).not.toBe(a.seed)
  expect(a.def.timeLimit).toBe(60)
  expect(a.def.combos).toBe(true)
  expect(startLevel(a.def, a.seed).status).toBe("playing")
})

test("the streak grows on consecutive days and resets after a gap", () => {
  let s = updateStreak({ last: null, count: 0 }, "2026-10-18")
  expect(s).toEqual({ last: "2026-10-18", count: 1 })
  expect(updateStreak(s, "2026-10-18")).toEqual(s)
  s = updateStreak(s, "2026-10-19")
  expect(s.count).toBe(2)
  expect(updateStreak({ last: "2026-10-31", count: 4 }, "2026-11-01").count).toBe(5)
  expect(updateStreak(s, "2026-10-22").count).toBe(1)
})

test("the share text has score, fakes, answers and streak", () => {
  const t = shareText({ key: "2026-10-18", score: 2340, fakes: 14, answers: [true, true, false], streak: 3, url: "https://x.test/" })
  expect(t).toContain("18.10")
  expect(t).toContain("2 340")
  expect(t).toContain("14")
  expect(t).toContain("✅✅❌")
  expect(t).toContain("3")
  expect(t).toContain("https://x.test/")
})
