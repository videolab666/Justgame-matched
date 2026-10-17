import { expect, test } from "vitest"
import { findMatches } from "../../src/logic/match"
import { board } from "./helpers"

const shapes = (rows: string[]) => {
  const { g, cells } = board(rows)
  return findMatches(g, cells).map((m) => m.shape).sort()
}

test("three in a row", () => {
  expect(shapes(["0001", "1212", "2121"])).toEqual(["line3"])
})
test("four horizontal and four vertical", () => {
  expect(shapes(["00001", "12121", "21212"])).toEqual(["line4h"])
  expect(shapes(["012", "021", "012", "021", "123"])).toEqual(["line4v"])
})
test("five in a row", () => {
  expect(shapes(["000001", "121212", "212121"])).toEqual(["line5"])
})
test("L shape of 3+3 sharing a corner is one lt group of 5", () => {
  const { g, cells } = board(["0001", "0212", "0121", "1212"])
  const m = findMatches(g, cells)
  expect(m).toHaveLength(1)
  expect(m[0].shape).toBe("lt")
  expect(m[0].cells).toHaveLength(5)
  expect(m[0].kind).toBe(0)
})
test("a fake breaks a run", () => {
  expect(shapes(["00x00", "12121", "21212"])).toEqual([])
})
test("two separate triples are two groups", () => {
  expect(shapes(["000123", "123444", "212121"])).toEqual(["line3", "line3"])
})
