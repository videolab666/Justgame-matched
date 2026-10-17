import type { LevelDef } from "../logic/level"

/** Icon for a level's "fakes" goal: the level's most common fake type. */
export function fakeIcon(def: LevelDef): string {
  const count = new Map<string, number>()
  for (const f of def.initialFakes) count.set(f.fake, (count.get(f.fake) ?? 0) + 1)
  const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "sms"
  return { sms: "fake-sms", ad: "fake-ad", call: "fake-call", forgery: "fake-forgery" }[top] ?? "fake-sms"
}
