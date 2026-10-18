import { gsap } from "gsap"
import { Application, Container, FillGradient, Graphics } from "pixi.js"
import { sfx } from "./audio/sfx"
import { pickScam } from "./content/deck"
import { dailyKey, dailyLevel, shareText, updateStreak } from "./content/daily"
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
import { installState, promptInstall, registerSW } from "./pwa"
import { loadSave, writeSave } from "./save"
import { mountHud } from "./ui/hud"
import { showScam } from "./ui/scam-card"
import { showDailyResult, showIntro, showMap, showResult, showSettings, showStart } from "./ui/screens"
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
  // «Справа дня» clock: real seconds, paused while a message or settings are open.
  const clock = { active: false, left: 0, paused: false, up: false, shown: -1 }
  app.ticker.add((t) => {
    fx.update((t.deltaMS / 1000) * gsap.globalTimeline.timeScale(), performance.now())
    fx.twinkle(performance.now())
    quality.sample(t.deltaMS)
    if (!clock.active || clock.paused || clock.up) return
    clock.left = Math.max(0, clock.left - t.deltaMS / 1000)
    const sec = Math.ceil(clock.left)
    if (sec !== clock.shown) { clock.shown = sec; hud.setTime(sec); if (sec <= 5 && sec > 0) sfx.tick() }
    if (clock.left <= 0) { clock.up = true; if (!view.locked) timeUp() }
  })
  const timeUp = () => { if (endLevel) { const e = endLevel; endLevel = null; clock.active = false; e("won") } }
  addEventListener("pointerdown", () => sfx.unlock(), { once: true })

  const layout = () => {
    const cell = cellFor()
    view.layout(cell)
    const boardH = cell * BOARD.h
    const top = Math.max(HUD_TOP, Math.round((innerHeight - boardH) / 2 + 30))
    view.position.set(Math.round((innerWidth - cell * BOARD.w) / 2), Math.min(top, innerHeight - boardH - BOTTOM))
    setRest(stage)
    const grad = new FillGradient({ type: "linear", start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, colorStops: [
      { offset: 0, color: "#ff6fb5" }, { offset: 0.22, color: "#9b3fe0" }, { offset: 0.6, color: "#4a1fa8" }, { offset: 1, color: "#1e0b52" },
    ] })
    bg.clear().rect(0, 0, innerWidth, innerHeight).fill(grad)
    // Soft candy bokeh (fixed pattern so it does not jump on resize).
    const dots: [number, number, number, number, number][] = [
      [0.12, 0.08, 46, 0xffe14d, 0.18], [0.85, 0.12, 60, 0x7ab8ff, 0.16], [0.7, 0.35, 34, 0xff9ad1, 0.14],
      [0.08, 0.55, 54, 0x5ff2b6, 0.12], [0.92, 0.7, 70, 0xffa95c, 0.12], [0.3, 0.9, 64, 0xc77aff, 0.14], [0.6, 0.82, 26, 0xffffff, 0.12],
    ]
    for (const [x, y, r, color, alpha] of dots) bg.circle(x * innerWidth, y * innerHeight, r).fill({ color, alpha })
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
    clock.paused = true
    const r = await showSettings(ui, save, true)
    applySettings()
    clock.paused = false
    view.locked = false
    if (r === "audience") { save.audience = await showStart(ui); writeSave(save) }
    if (r === "map" && endLevel) { const e = endLevel; endLevel = null; clock.active = false; e("quit") }
  })

  async function interrupt() {
    const pick = pickScam(save.seen, save.audience ?? "self", state.def.categories, deckRng)
    save.seen = pick.seen
    writeSave(save)
    const scam = pick.scam
    view.locked = true
    clock.paused = true
    const timed = clock.active
    const r = await showScam(ui, scam, SCAM_SECONDS, (a) =>
      a.correct ? (scam.isFake ? "🛡️ Бонус: Кіберполіція!" : timed ? "⏱️ +5 секунд!" : "➕ +2 ходи!") : "⚠️ +2 фейки на полі")
    clock.paused = false
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
    } else if (r.correct && timed) {
      clock.left += 5
      popText(fx.layer, "+5 секунд", mid.x, mid.y, 36)
    } else if (r.correct) {
      state = addMoves(state, 2)
      popText(fx.layer, "+2 ходи", mid.x, mid.y, 36)
    } else {
      state = addFakes(state, 2).state
      await view.setBoard(state.board, true)
    }
    hud.update(state)
    view.locked = false
    if (clock.up) timeUp()
    else checkEnd()
  }

  function playLevel(def: LevelDef, seed = Date.now() % 1_000_000): Promise<"won" | "lost" | "quit"> {
    state = startLevel(def, seed)
    Object.assign(clock, { active: !!def.timeLimit, left: def.timeLimit ?? 0, paused: false, up: false, shown: -1 })
    answers = []
    hud.resetStars()
    hud.update(state)
    void view.setBoard(state.board)
    view.locked = false
    ui.classList.add("in-level")
    return new Promise((resolve) => { endLevel = (r) => { ui.classList.remove("in-level"); resolve(r) } })
  }

  view.onSwap = async (a, b) => {
    if (view.locked || state.status !== "playing" || clock.up) return
    const r = applyMove(state, a, b)
    if (!r.steps.length) { sfx.error(); await view.shakeInvalid(a, b); return }
    sfx.swap()
    await view.play(a, b, r.steps, { infected: r.infected, shuffled: r.shuffled })
    state = r.state
    await view.setBoard(state.board, true)
    if (r.hops) sfx.ring()
    hud.update(state)
    if (clock.up) timeUp()
    else if (r.interruptDue) await interrupt()
    else checkEnd()
  }

  async function playDaily() {
    const key = dailyKey(new Date())
    const { def, seed } = dailyLevel(key)
    await showIntro(ui, def)
    const outcome = await playLevel(def, seed)
    if (outcome === "quit") return
    view.locked = true
    if (save.daily.key !== key) save.daily = { key, best: 0 }
    const record = state.score > save.daily.best
    save.daily.best = Math.max(save.daily.best, state.score)
    save.streak = updateStreak(save.streak, key)
    writeSave(save)
    sfx.win()
    fx.confetti()
    await wait(900)
    const fakes = state.progress[0]
    const text = shareText({ key, score: state.score, fakes, answers: answers.map((a) => a.correct), streak: save.streak.count, url: location.origin + location.pathname })
    const c = await showDailyResult(ui, { score: state.score, fakes, best: save.daily.best, record, streak: save.streak.count, text, answers })
    if (c === "retry") return playDaily()
  }

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
  // Debug handle for automated checks (state is read-only from outside).
  ;(window as unknown as { __nv: unknown }).__nv = { get state() { return state }, get answers() { return answers }, view, fx, interrupt }
  registerSW()
  if (!save.audience) { save.audience = await showStart(ui); writeSave(save) }
  const chapterOf = (id: string) => CHAPTERS.findIndex((c) => c.levels.some((l) => l.id === id))
  let ci = Math.max(0, chapterOf((LEVELS.find((l) => !save.stars[l.id]) ?? LEVELS[LEVELS.length - 1]).id))
  for (;;) {
    const choice = await showMap(ui, save, CHAPTERS, ci, { key: dailyKey(new Date()), install: installState() })
    if (choice.kind === "refresh") { writeSave(save); continue }
    if (choice.kind === "daily") { await playDaily(); continue }
    if (choice.kind === "install") { await promptInstall(); continue }
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
