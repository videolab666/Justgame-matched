// Balance bot: plays every chapter-1 level many times and reports win rate,
// moves used and scam interrupts seen. Run: npx vite-node scripts/bot.ts
import { CHAPTER1 } from "../src/content/levels"
import { isTile } from "../src/logic/cells"
import { addFakes, addMoves, applyMove, applyPolice, startLevel, starsFor, type LevelState } from "../src/logic/level"
import { makeRng } from "../src/logic/rng"

type Mode = "greedy" | "random"

function moves(s: LevelState) {
  const out: [number, number][] = []
  for (let i = 0; i < 56; i++) for (const j of [i + 1, i + 7]) {
    if (j >= 56 || (j === i + 1 && i % 7 === 6)) continue
    out.push([i, j])
  }
  return out.filter(([a, b]) => applyMove(s, a, b).steps.length)
}

function play(defIndex: number, seed: number, mode: Mode, accuracy: number) {
  const rng = makeRng(seed * 7919 + 13)
  let s = startLevel(CHAPTER1[defIndex], seed)
  let used = 0, interrupts = 0
  for (let guard = 0; guard < 200 && s.status === "playing"; guard++) {
    const opts = moves(s)
    if (!opts.length) break
    let pick = opts[rng.int(opts.length)]
    if (mode === "greedy") {
      let best = -1
      for (const [a, b] of opts) {
        const r = applyMove(s, a, b)
        const v = r.state.progress.reduce((x, y) => x + y, 0) * 100 + r.state.score - s.score
        if (v > best) { best = v; pick = [a, b] }
      }
    }
    const r = applyMove(s, pick[0], pick[1])
    s = r.state
    used++
    if (r.interruptDue) {
      interrupts++
      const fake = rng.next() < 0.62
      const correct = rng.next() < accuracy
      if (correct && fake) {
        const tiles = s.board.cells.map((c, i) => (isTile(c) && !c.special ? i : -1)).filter((i) => i >= 0)
        s = applyPolice(s, tiles[rng.int(tiles.length)]).state
      } else if (correct) s = addMoves(s, 2)
      else s = addFakes(s, 2).state
    }
  }
  return { won: s.status === "won", used, interrupts, stars: starsFor(s.def, s.score, s.status === "won"), score: s.score }
}

const N = Number(process.argv[2] ?? 30)
for (const [mode, acc] of [["greedy", 0.75], ["random", 0.6]] as [Mode, number][]) {
  console.log(`\n== ${mode} (scam accuracy ${acc}) ==`)
  CHAPTER1.forEach((def, k) => {
    const runs = Array.from({ length: N }, (_, n) => play(k, n + 1, mode, acc))
    const wins = runs.filter((r) => r.won)
    const avg = (f: (r: typeof runs[0]) => number, rs = runs) => (rs.reduce((a, r) => a + f(r), 0) / Math.max(1, rs.length)).toFixed(1)
    const st = [1, 2, 3].map((x) => wins.filter((r) => r.stars === x).length)
    console.log(`${def.id}  win ${String(Math.round((wins.length / N) * 100)).padStart(3)}%  moves ${avg((r) => r.used)}/${def.moves}  scams ${avg((r) => r.interrupts)}  score ${avg((r) => r.score, wins)}  stars1/2/3 ${st.join("/")}`)
  })
}
