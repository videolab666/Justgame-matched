import { gsap } from "gsap"
import { Application, Container, FillGradient, Graphics } from "pixi.js"
import { sfx } from "./audio/sfx"
import { pickScam } from "./content/deck"
import { CHAPTERS, LEVELS } from "./content/levels"
import type { Scam } from "./content/types"
import { BoardEffects } from "./fx/board-fx"
import { popText, setRest } from "./fx/juice"
import { quality } from "./fx/quality"
import { isTile } from "./logic/cells"
import { addFakes, addMoves, applyMove, applyPolice, BOARD, starsFor, startLevel, type LevelDef, type LevelState } from "./logic/level"
import { makeRng } from "./logic/rng"
import { BoardView } from "./render/board-view"
import { loadTextures } from "./render/textures"
import { loadSave, writeSave } from "./save"
import { mountHud } from "./ui/hud"
import { showScam } from "./ui/scam-card"
import { showIntro, showMap, showResult, showSettings, showStart } from "./ui/screens"
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

  const save = loadSave()
  const osReduced = quality.reducedMotion
  const applySettings = () => {
    sfx.setEnabled(save.settings.sound)
    quality.reducedMotion = osReduced || save.settings.reducedMotion
    writeSave(save)
  }
  applySettings()
  const deckRng = makeRng(Date.now() % 1_000_000)

  let state!: LevelState
  let answers: Answer[] = []
  let endLevel: ((r: "won" | "lost" | "quit") => void) | null = null
  const checkEnd = () => { if (state.status !== "playing" && endLevel) { const e = endLevel; endLevel = null; e(state.status === "won" ? "won" : "lost") } }

  const hud = mountHud(ui, async () => {
    if (view.locked) return
    view.locked = true
    const r = await showSettings(ui, save, true)
    applySettings()
    view.locked = false
    if (r === "audience") { save.audience = await showStart(ui); writeSave(save) }
    if (r === "map" && endLevel) { const e = endLevel; endLevel = null; e("quit") }
  })

  async function interrupt() {
    const pick = pickScam(save.seen, save.audience ?? "self", state.def.categories, deckRng)
    save.seen = pick.seen
    writeSave(save)
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
    checkEnd()
  }

  function playLevel(def: LevelDef): Promise<"won" | "lost" | "quit"> {
    state = startLevel(def, Date.now() % 1_000_000)
    answers = []
    hud.resetStars()
    hud.update(state)
    void view.setBoard(state.board)
    view.locked = false
    ui.classList.add("in-level")
    return new Promise((resolve) => { endLevel = (r) => { ui.classList.remove("in-level"); resolve(r) } })
  }

  view.onSwap = async (a, b) => {
    if (view.locked || state.status !== "playing") return
    const r = applyMove(state, a, b)
    if (!r.steps.length) { sfx.error(); await view.shakeInvalid(a, b); return }
    sfx.swap()
    await view.play(a, b, r.steps, { infected: r.infected, shuffled: r.shuffled })
    state = r.state
    await view.setBoard(state.board, true)
    if (r.hops) sfx.ring()
    hud.update(state)
    if (r.interruptDue) await interrupt()
    else checkEnd()
  }

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
  // Debug handle for automated checks (state is read-only from outside).
  ;(window as unknown as { __nv: unknown }).__nv = { get state() { return state }, get answers() { return answers }, view, fx, interrupt }
  if (!save.audience) { save.audience = await showStart(ui); writeSave(save) }
  const chapterOf = (id: string) => CHAPTERS.findIndex((c) => c.levels.some((l) => l.id === id))
  let ci = Math.max(0, chapterOf((LEVELS.find((l) => !save.stars[l.id]) ?? LEVELS[LEVELS.length - 1]).id))
  for (;;) {
    const choice = await showMap(ui, save, CHAPTERS, ci)
    if (choice.kind === "refresh") { writeSave(save); continue }
    if (choice.kind === "chapter") { ci = Math.min(CHAPTERS.length - 1, Math.max(0, choice.ci)); continue }
    if (choice.kind === "settings") {
      writeSave(save)
      const r = await showSettings(ui, save, false)
      applySettings()
      if (r === "audience") { save.audience = await showStart(ui); writeSave(save) }
      continue
    }
    let k = LEVELS.findIndex((l) => l.id === choice.id)
    while (k >= 0 && k < LEVELS.length) {
      const def = LEVELS[k]
      ci = chapterOf(def.id)
      await showIntro(ui, def)
      const outcome = await playLevel(def)
      if (outcome === "quit") break
      const won = outcome === "won"
      const stars = starsFor(def, state.score, won)
      if (won) {
        save.stars[def.id] = Math.max(save.stars[def.id] ?? 0, stars)
        writeSave(save)
        sfx.win()
        fx.confetti()
        await wait(1100)
      } else await wait(500)
      const c = await showResult(ui, { won, stars, score: state.score, hasNext: k + 1 < LEVELS.length, answers })
      if (c === "map") break
      if (c === "next") k++
    }
  }
}

boot()
