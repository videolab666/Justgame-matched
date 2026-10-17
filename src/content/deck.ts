import type { Rng } from "../logic/rng"
import { SCAMS } from "./scams"
import type { Audience, Scam, ScamCategory } from "./types"

/** Next scenario for this audience and level categories, without repeats
 * until the matching pool is used up (then that pool starts over). */
export function pickScam(seen: string[], audience: Audience, categories: ScamCategory[], rng: Rng): { scam: Scam; seen: string[] } {
  let pool = SCAMS.filter((s) => s.audience.includes(audience) && categories.includes(s.category))
  if (!pool.length) pool = SCAMS.filter((s) => s.audience.includes(audience))
  const ids = new Set(pool.map((s) => s.id))
  let fresh = pool.filter((s) => !seen.includes(s.id))
  let kept = seen
  if (!fresh.length) { kept = seen.filter((id) => !ids.has(id)); fresh = pool }
  const scam = fresh[rng.int(fresh.length)]
  return { scam, seen: [...kept, scam.id] }
}
