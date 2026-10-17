import { beforeEach, expect, test } from "vitest"
import { loadSave, writeSave } from "../src/save"

const store = new Map<string, string>()
beforeEach(() => {
  store.clear()
  ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  } as Storage
})

test("broken JSON gives defaults", () => {
  store.set("ne-vedys-save-v1", "{oops")
  const s = loadSave()
  expect(s.audience).toBeNull()
  expect(s.settings.sound).toBe(true)
})
test("a save round-trips and unknown audience is dropped", () => {
  const s = loadSave()
  s.audience = "kids"; s.stars["1-1"] = 3; s.seen = ["bank-cvv"]
  writeSave(s)
  expect(loadSave()).toMatchObject({ audience: "kids", stars: { "1-1": 3 }, seen: ["bank-cvv"] })
  store.set("ne-vedys-save-v1", JSON.stringify({ v: 1, audience: "aliens" }))
  expect(loadSave().audience).toBeNull()
})
