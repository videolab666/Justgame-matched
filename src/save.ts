import type { Audience } from "./content/types"

export type SaveData = {
  v: 1
  audience: Audience | null
  stars: Record<string, number>
  seen: string[]
  allOpen: boolean
  settings: { sound: boolean; reducedMotion: boolean }
}

const KEY = "ne-vedys-save-v1"
const fresh = (): SaveData => ({ v: 1, audience: null, stars: {}, seen: [], allOpen: false, settings: { sound: true, reducedMotion: false } })

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
    }
  } catch {
    return fresh()
  }
}

export function writeSave(s: SaveData) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private mode: keep playing without saving */ }
}
