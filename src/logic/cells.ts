/** Cell model. Tiles are the six "things" (passport, stamp, key, phone,
 * bank card, envelope); fakes are blockers that never match. `id` is stable
 * across moves so the renderer can keep one sprite per cell content. */
export type Kind = 0 | 1 | 2 | 3 | 4 | 5
export const KINDS = 6
export const KIND_NAMES = ["passport", "stamp", "key", "phone", "card", "envelope"] as const

export type Special = "row" | "col" | "notify" | "kep" | "police"
export type FakeType = "sms" | "ad" | "call" | "forgery"
export const FAKE_HP: Record<FakeType, number> = { sms: 1, ad: 2, call: 1, forgery: 1 }

export type TileCell = { t: "tile"; kind: Kind; special?: Special; id: number }
/** `disguise`/`revealed`: a forgery looks like a tile of kind `disguise`
 * until a nearby match exposes it. */
export type FakeCell = { t: "fake"; fake: FakeType; hp: number; id: number; disguise?: Kind; revealed?: boolean }
export type Cell = TileCell | FakeCell

export const isTile = (c: Cell | null | undefined): c is TileCell => !!c && c.t === "tile"
export const isFake = (c: Cell | null | undefined): c is FakeCell => !!c && c.t === "fake"
