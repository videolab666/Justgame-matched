import { expect, test } from "vitest"
import { isFake, isTile } from "../../src/logic/cells"
import { spreadFake } from "../../src/logic/fakes"
import { generateBoard, hasValidMove, shuffleBoard } from "../../src/logic/generate"
import { findMatches } from "../../src/logic/match"
import { makeRng } from "../../src/logic/rng"
import type { Board } from "../../src/logic/resolve"
import { board } from "./helpers"

const g = { w: 7, h: 8 }
const fakes = [{ index: 10, fake: "sms" as const, hp: 1 }, { index: 30, fake: "sms" as const, hp: 1 }]

test("generated boards have no matches, have a move and keep the requested fakes", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const b = generateBoard(g, makeRng(seed), fakes)
    expect(findMatches(g, b.cells)).toEqual([])
    expect(hasValidMove(b)).toBe(true)
    expect(isFake(b.cells[10]) && isFake(b.cells[30])).toBe(true)
    expect(new Set(b.cells.map((c) => c.id)).size).toBe(56)
  }
})

test("shuffle keeps kinds and fakes, and leaves a playable board", () => {
  const b = generateBoard(g, makeRng(9), fakes)
  const kinds = (x: Board) => x.cells.filter(isTile).map((c) => c.kind).sort()
  const { board: s, moved } = shuffleBoard(b, makeRng(4))
  expect(kinds(s)).toEqual(kinds(b))
  expect(isFake(s.cells[10]) && isFake(s.cells[30])).toBe(true)
  expect(findMatches(g, s.cells)).toEqual([])
  expect(hasValidMove(s)).toBe(true)
  expect(Object.keys(moved).length).toBeGreaterThan(0)
})

test("a stuck board has no valid move", () => {
  const { g: gg, cells } = board(["0123", "4501", "2345", "0123"])
  expect(hasValidMove({ g: gg, cells, nextId: 100 })).toBe(false)
})

test("spreading turns exactly one neighbour tile into a fake of the same type", () => {
  const { g: gg, cells } = board(["0123", "4x01", "2345"])
  const before = cells.filter(isFake).length
  const { board: out, infected } = spreadFake({ g: gg, cells, nextId: 100 }, makeRng(1))
  expect(out.cells.filter(isFake).length).toBe(before + 1)
  expect(infected!.from).toBe(5)
  expect([1, 4, 6, 9]).toContain(infected!.to)
  const made = out.cells[infected!.to]
  expect(isFake(made) && made.fake === "sms" && made.hp === 1).toBe(true)
})

test("no spreading when no fake has a tile neighbour", () => {
  const { g: gg, cells } = board(["xx", "xx"])
  expect(spreadFake({ g: gg, cells, nextId: 9 }, makeRng(1)).infected).toBeUndefined()
})
