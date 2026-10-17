import { Application, Container, FillGradient, Graphics } from "pixi.js"
import { CHAPTER1 } from "./content/levels"
import { applyMove, BOARD, startLevel, type LevelState } from "./logic/level"
import { BoardView } from "./render/board-view"
import { loadTextures } from "./render/textures"

const HUD_TOP = 150
const BOTTOM = 24

async function boot() {
  const app = new Application()
  await app.init({ resizeTo: window, antialias: true, resolution: Math.min(devicePixelRatio, 2), autoDensity: true, background: "#140f33" })
  document.getElementById("app")!.appendChild(app.canvas)

  const bg = new Graphics()
  const stage = new Container()
  app.stage.addChild(bg, stage)

  const cellFor = () => Math.floor(Math.min((innerWidth - 16) / BOARD.w, (innerHeight - HUD_TOP - BOTTOM) / BOARD.h))
  const tex = await loadTextures(cellFor() * Math.min(devicePixelRatio, 2))
  const view = new BoardView(tex, BOARD)
  stage.addChild(view)

  let state: LevelState = startLevel(CHAPTER1[0], Date.now() % 100000)
  view.setBoard(state.board)

  const layout = () => {
    const cell = cellFor()
    view.layout(cell)
    view.position.set(Math.round((innerWidth - cell * BOARD.w) / 2), HUD_TOP)
    const grad = new FillGradient({ type: "linear", start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, colorStops: [
      { offset: 0, color: "#2b1a6e" }, { offset: 0.55, color: "#170f3d" }, { offset: 1, color: "#0b0822" },
    ] })
    bg.clear().rect(0, 0, innerWidth, innerHeight).fill(grad)
  }
  layout()
  addEventListener("resize", layout)

  view.onSwap = async (a, b) => {
    if (view.locked || state.status !== "playing") return
    const r = applyMove(state, a, b)
    if (!r.steps.length) { await view.shakeInvalid(a, b); return }
    await view.play(a, b, r.steps, { infected: r.infected, shuffled: r.shuffled })
    state = r.state
    await view.setBoard(state.board, true)
  }
  ;(window as unknown as { __nv: unknown }).__nv = { get state() { return state }, view }
}

boot()
