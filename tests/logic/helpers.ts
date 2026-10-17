import type { Cell, Kind } from "../../src/logic/cells"
import type { Grid } from "../../src/logic/grid"

/** Build cells from rows of characters: 0-5 tile kinds, x = sms fake,
 * X = ad fake (2 hp), R/C/N/K = row/col/notify/kep special of kind 0. */
export function board(rows: string[]): { g: Grid; cells: Cell[] } {
  const g = { w: rows[0].length, h: rows.length }
  let id = 1
  const cells: Cell[] = []
  for (const row of rows) for (const ch of row) {
    if (ch === "x") cells.push({ t: "fake", fake: "sms", hp: 1, id: id++ })
    else if (ch === "X") cells.push({ t: "fake", fake: "ad", hp: 2, id: id++ })
    else if ("RCNK".includes(ch)) {
      const special = ({ R: "row", C: "col", N: "notify", K: "kep" } as const)[ch as "R"]
      cells.push({ t: "tile", kind: 0, special, id: id++ })
    } else cells.push({ t: "tile", kind: Number(ch) as Kind, id: id++ })
  }
  return { g, cells }
}
