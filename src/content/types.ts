export type Audience = "self" | "parents" | "kids"
export type ScamCategory = "bank" | "marketplace" | "family" | "gov" | "social" | "work_invest" | "games"
export type Channel = "sms" | "viber" | "telegram" | "call" | "olx" | "diia" | "instagram" | "game"

/** One message the player judges. `flags` are substrings of `sender`/`text` that give
 * a fake away (highlighted in the review); real messages have none. */
export type Scam = {
  id: string
  category: ScamCategory
  audience: Audience[]
  channel: Channel
  sender: string
  text: string
  isFake: boolean
  flags: string[]
  explain: string
}
