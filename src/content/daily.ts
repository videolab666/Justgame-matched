import type { LevelDef } from "../logic/level"
import { makeRng } from "../logic/rng"
import { fakes } from "./levels"

export const DAILY_SECONDS = 60

const pad = (n: number) => String(n).padStart(2, "0")
/** Local calendar date: everyone plays the same board on the same day. */
export const dailyKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/** Today's 60-second round: every mechanic, a mixed set of fakes. */
export function dailyLevel(key: string): { def: LevelDef; seed: number } {
  const seed = hash("ne-vedys:" + key)
  const rng = makeRng(seed)
  const pattern = Array.from({ length: 8 }, () => "sacf"[rng.int(4)]).join("")
  const def: LevelDef = {
    id: "daily", chapter: 4, title: "Справа дня", moves: 999,
    goals: [{ type: "fakes", n: 999 }],
    initialFakes: fakes(pattern, rng.int(15)), spreadEvery: 2, interruptEvery: 5,
    categories: ["bank", "marketplace", "family", "gov", "social", "work_invest", "games"],
    stars: [0, 1200, 2000], specials: ["row", "col", "notify", "kep"], combos: true, timeLimit: DAILY_SECONDS,
    hint: "60 секунд! Гаси якомога більше фейків, складай комбо — і не ведись на повідомлення.",
  }
  return { def, seed }
}

const dayNumber = (key: string) => { const [y, m, d] = key.split("-").map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000) }

/** Consecutive-days streak: same day keeps it, the next day adds one, a gap resets. */
export function updateStreak(s: { last: string | null; count: number }, key: string): { last: string; count: number } {
  if (s.last === key) return { last: key, count: s.count }
  const next = s.last !== null && dayNumber(key) - dayNumber(s.last) === 1
  return { last: key, count: next ? s.count + 1 : 1 }
}

const thousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ")
function days(n: number) {
  const a = n % 10, b = n % 100
  return a === 1 && b !== 11 ? "день" : a >= 2 && a <= 4 && (b < 12 || b > 14) ? "дні" : "днів"
}

export function shareText(r: { key: string; score: number; fakes: number; answers: boolean[]; streak: number; url: string }): string {
  const [, m, d] = r.key.split("-")
  return [
    `Не ведись! · Справа дня ${d}.${m}`,
    `🏆 ${thousands(r.score)} очок · 🛡️ ${r.fakes} фейків погашено`,
    r.answers.length ? `💬 ${r.answers.map((x) => (x ? "✅" : "❌")).join("")}` : "",
    `🔥 Серія: ${r.streak} ${days(r.streak)}`,
    r.url,
  ].filter(Boolean).join("\n")
}
