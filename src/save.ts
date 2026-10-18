import type { Audience } from "./content/types"
import type { Boosters } from "./logic/bonus"

export type SaveData = {
  v: 1
  audience: Audience | null
  stars: Record<string, number>
  seen: string[]
  allOpen: boolean
  settings: { sound: boolean; reducedMotion: boolean }
  daily: { key: string; best: number }
  streak: { last: string | null; count: number }
  boosters: Boosters
}

const KEY = "ne-vedys-save-v1"
const fresh = (): SaveData => ({ v: 1, audience: null, stars: {}, seen: [], allOpen: false, settings: { sound: true, reducedMotion: false }, daily: { key: "", best: 0 }, streak: { last: null, count: 0 }, boosters: { row: 1, notify: 1, kep: 1, moves: 1 } })

/** Read the save; broken or missing data (or blocked storage) gives defaults. */
export function loadSave(): SaveData {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null")
    if (!raw || raw.v !== 1) return fresh()
    const d = fresh()
    return {
      ...d,
      audience: ["self", "parents", "kids"].includes(raw.audience) ? raw.audience : null,
      stars: typeof raw.stars === "object" && raw.stars ? raw.stars : {},
      seen: Array.isArray(raw.seen) ? raw.seen.filter((x: unknown) => typeof x === "string") : [],
      allOpen: raw.allOpen === true,
      settings: { ...d.settings, ...(raw.settings ?? {}) },
      daily: raw.daily && typeof raw.daily.key === "string" && typeof raw.daily.best === "number" ? raw.daily : d.daily,
      boosters: raw.boosters && typeof raw.boosters === "object"
        ? { row: +raw.boosters.row || 0, notify: +raw.boosters.notify || 0, kep: +raw.boosters.kep || 0, moves: +raw.boosters.moves || 0 }
        : d.boosters,
      streak: raw.streak && typeof raw.streak.count === "number" ? { last: typeof raw.streak.last === "string" ? raw.streak.last : null, count: raw.streak.count } : d.streak,
    }
  } catch {
    return fresh()
  }
}

export function writeSave(s: SaveData) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private mode: keep playing without saving */ }
}
