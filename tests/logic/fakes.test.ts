import { expect, test } from "vitest"
import { isFake, isTile } from "../../src/logic/cells"
import { hopCalls, spreadFake } from "../../src/logic/fakes"
import { generateBoard } from "../../src/logic/generate"
import { makeRng } from "../../src/logic/rng"
import { resolveSwap, type Board, type Rules } from "../../src/logic/resolve"
import { board } from "./helpers"

const NONE: Rules = { specials: new Set() }
const mk = (rows: string[]): Board => { const { g, cells } = board(rows); return { g, cells, nextId: 900 } }

test("a call swaps places with a plain neighbour tile", () => {
  const b = mk(["0123", "4P01", "2345"])
  const tileIds = b.cells.filter(isTile).map((c) => c.id).sort()
  const { board: out, hops } = hopCalls(b, makeRng(2))
  expect(hops).toHaveLength(1)
  expect(hops[0].from).toBe(5)
  expect([1, 4, 6, 9]).toContain(hops[0].to)
  expect(isFake(out.cells[hops[0].to])).toBe(true)
  expect(isTile(out.cells[5])).toBe(true)
  expect(out.cells.filter(isTile).map((c) => c.id).sort()).toEqual(tileIds)
})

test("a call boxed in by fakes stays", () => {
  const b = mk(["xxx", "xPx", "xxx"])
  expect(hopCalls(b, makeRng(1)).hops).toEqual([])
})

test("a forgery is revealed by the first hit and destroyed by the second", () => {
  const b = mk(["0010", "F212", "2121", "3434"])
  const first = resolveSwap(b, 2, 3, makeRng(2), NONE)
  expect(first.steps[0].fakesHit).toEqual([{ index: 4, destroyed: false, revealed: true }])
  const f = first.board.cells.find((c) => isFake(c) && c.fake === "forgery")
  expect(f && isFake(f) && f.revealed).toBe(true)
})

test("spreading a forgery makes a disguised forgery of the infected tile's kind", () => {
  const b = mk(["3333", "4F55", "2222"])
  const { board: out, infected } = spreadFake(b, makeRng(1))
  const made = out.cells[infected!.to]
  const before = b.cells[infected!.to]
  expect(isFake(made) && made.fake === "forgery" && made.revealed === false).toBe(true)
  expect(isFake(made) && isTile(before) && made.disguise === before.kind).toBe(true)
})

test("generated forgeries get a disguise", () => {
  const b = generateBoard({ w: 7, h: 8 }, makeRng(3), [{ index: 10, fake: "forgery", hp: 1 }])
  const f = b.cells[10]
  expect(isFake(f) && f.fake === "forgery" && f.disguise !== undefined && f.revealed === false).toBe(true)
})
