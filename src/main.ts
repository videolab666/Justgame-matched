import { gsap } from "gsap"
import { Application, Container, FillGradient, Graphics } from "pixi.js"
import { sfx } from "./audio/sfx"
import { pickScam } from "./content/deck"
import { CHAPTER1 } from "./content/levels"
import type { Audience, Scam } from "./content/types"
import { BoardEffects } from "./fx/board-fx"
import { popText, setRest } from "./fx/juice"
import { quality } from "./fx/quality"
import { isTile } from "./logic/cells"
import { addFakes, addMoves, applyMove, applyPolice, BOARD, startLevel, type LevelDef, type LevelState } from "./logic/level"
import { makeRng } from "./logic/rng"
import { BoardView } from "./render/board-view"
import { loadTextures } from "./render/textures"
import { mountHud } from "./ui/hud"
import { showScam } from "./ui/scam-card"
import "./ui/styles.css"

const HUD_TOP = 130
const BOTTOM = 24
const SCAM_SECONDS = 6

export type Answer = { scam: Scam; answer: string; correct: boolean }

async function boot() {
  const app = new Application()
  await app.init({ resizeTo: window, antialias: true, resolution: Math.min(devicePixelRatio, 2), autoDensity: true, background: "#140f33" })
  document.getElementById("app")!.appendChild(app.canvas)
  const ui = document.createElement("div")
  ui.id = "ui"
  document.body.append(ui)

  const bg = new Graphics()
  const stage = new Container()
  const overlay = new Container()
  app.stage.addChild(bg, stage, overlay)

  const cellFor = () => Math.floor(Math.min((innerWidth - 16) / BOARD.w, (innerHeight - HUD_TOP - BOTTOM) / BOARD.h))
  const tex = await loadTextures(cellFor() * Math.min(devicePixelRatio, 2))
  const view = new BoardView(tex, BOARD)
  stage.addChild(view)
  const fx = new BoardEffects(view, stage, tex, () => ({ w: innerWidth, h: innerHeight }), overlay)
  view.fx = fx
  app.ticker.add((t) => {
    fx.update((t.deltaMS / 1000) * gsap.globalTimeline.timeScale(), performance.now())
    quality.sample(t.deltaMS)
  })
  addEventListener("pointerdown", () => sfx.unlock(), { once: true })

  const layout = () => {
    const cell = cellFor()
    view.layout(cell)
    const boardH = cell * BOARD.h
    const top = Math.max(HUD_TOP, Math.round((innerHeight - boardH) / 2 + 30))
    view.position.set(Math.round((innerWidth - cell * BOARD.w) / 2), Math.min(top, innerHeight - boardH - BOTTOM))
    setRest(stage)
    const grad = new FillGradient({ type: "linear", start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, colorStops: [
      { offset: 0, color: "#2b1a6e" }, { offset: 0.55, color: "#170f3d" }, { offset: 1, color: "#0b0822" },
    ] })
    bg.clear().rect(0, 0, innerWidth, innerHeight).fill(grad)
  }
  layout()
  addEventListener("resize", layout)

  const hud = mountHud(ui, () => {})
  const audience: Audience = "self"
  let seen: string[] = []
  const deckRng = makeRng(Date.now() % 1_000_000)

  let state: LevelState
  let answers: Answer[] = []

  async function interrupt() {
    const pick = pickScam(seen, audience, state.def.categories, deckRng)
    seen = pick.seen
    const scam = pick.scam
    view.locked = true
    const r = await showScam(ui, scam, SCAM_SECONDS, (a) =>
      a.correct ? (scam.isFake ? "🛡️ Бонус: Кіберполіція!" : "➕ +2 ходи!") : "⚠️ +2 фейки на полі")
    answers.push({ scam, answer: r.answer, correct: r.correct })
    const mid = { x: view.cell * 3.5, y: view.cell * 4 }
    if (r.correct && scam.isFake) {
      const tiles = state.board.cells.map((c, i) => (isTile(c) && !c.special ? i : -1)).filter((i) => i >= 0)
      const at = tiles[deckRng.int(tiles.length)]
      const res = applyPolice(state, at)
      const shown = state.board.cells.slice()
      const c = shown[at]
      if (isTile(c)) shown[at] = { ...c, special: "police" }
      await view.setBoard({ ...state.board, cells: shown }, true)
      await view.playSteps(res.steps)
      state = res.state
      await view.setBoard(state.board, true)
    } else if (r.correct) {
      state = addMoves(state, 2)
      popText(fx.layer, "+2 ходи", mid.x, mid.y, 36)
    } else {
      state = addFakes(state, 2).state
      await view.setBoard(state.board, true)
    }
    hud.update(state)
    view.locked = false
  }

  function start(def: LevelDef) {
    state = startLevel(def, Date.now() % 1_000_000)
    answers = []
    hud.resetStars()
    hud.update(state)
    void view.setBoard(state.board)
  }

  view.onSwap = async (a, b) => {
    if (view.locked || state.status !== "playing") return
    const r = applyMove(state, a, b)
    if (!r.steps.length) { sfx.error(); await view.shakeInvalid(a, b); return }
    sfx.swap()
    await view.play(a, b, r.steps, { infected: r.infected, shuffled: r.shuffled })
    state = r.state
    await view.setBoard(state.board, true)
    hud.update(state)
    if (r.interruptDue) await interrupt()
  }

  start(CHAPTER1[0])
  ;(window as unknown as { __nv: unknown }).__nv = { get state() { return state }, get answers() { return answers }, view, fx, interrupt }
}

boot()
