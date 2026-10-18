import { gsap } from "gsap"
import { RGBSplitFilter, ShockwaveFilter } from "pixi-filters"
import { Container, FillGradient, Sprite, type Texture } from "pixi.js"
import { sfx } from "../audio/sfx"
import type { BoardFx, BoardView } from "../render/board-view"
import { Bursts } from "./particles"
import { beam, bolt, flash, popText, ring, shake, slowMo } from "./juice"
import { quality } from "./quality"
import { comboMeter } from "../ui/combo"

const RAINBOW = () => new FillGradient({ type: "linear", start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, colorStops: [
  { offset: 0, color: "#ff7ab8" }, { offset: 0.3, color: "#ffe14d" }, { offset: 0.6, color: "#5ff2b6" }, { offset: 1, color: "#7ab8ff" },
] })
const COMBO = ["", "Супер!", "Схему зламано!", "Мега-комбо!", "Кібергерой!"]
const MAGENTA = 0xff3bd4

/** Wires board events to particles, filters, screen juice and sound. */
export class BoardEffects implements BoardFx {
  readonly layer = new Container()
  private sparkTex: Texture
  private bursts: Bursts
  private coins: Bursts
  private jackpotMove = false
  private lastPop = 0
  private twinkleAt = 0
  private glitchAt = 0

  constructor(private view: BoardView, private shakeTarget: Container, tex: Record<string, Texture>, private screen: () => { w: number; h: number }, private screenLayer: Container) {
    this.bursts = new Bursts(tex.spark)
    this.sparkTex = tex.spark
    this.coins = new Bursts(tex.coin, false)
    this.layer.addChild(this.bursts.view)
    this.screenLayer.addChild(this.coins.view)
    view.addChild(this.layer)
  }

  update(dt: number, now: number) {
    this.bursts.update(dt)
    this.coins.update(dt)
    // Idle glitch on a random fake every ~1.2 s keeps them visibly "wrong".
    if (now > this.glitchAt) {
      this.glitchAt = now + 900 + Math.random() * 900
      const fakes = this.view.fakeSprites()
      const s = fakes[Math.floor(Math.random() * fakes.length)]
      if (s && !quality.reducedMotion) {
        gsap.timeline()
          .to(s, { x: s.x + 4, duration: 0.03 }).to(s, { x: s.x - 4, duration: 0.03 }).to(s, { x: s.x, duration: 0.03 })
        s.children[0] && gsap.fromTo(s.children[0], { alpha: 0.55 }, { alpha: 1, duration: 0.15 })
      }
    }
  }

  /** A tiny star sparkles on a random tile now and then (the "glitter" in candy). */
  twinkle(now: number) {
    if (now < this.twinkleAt || quality.reducedMotion) return
    this.twinkleAt = now + 1400 + Math.random() * 1600
    const c = this.view.cell
    const x = (Math.floor(Math.random() * 7) + 0.2 + Math.random() * 0.6) * c
    const y = (Math.floor(Math.random() * 8) + 0.15 + Math.random() * 0.5) * c
    const s = new Sprite(this.sparkTex)
    s.anchor.set(0.5)
    s.position.set(x, y)
    s.blendMode = "add"
    s.tint = 0xffffff
    s.scale.set(0)
    this.layer.addChild(s)
    const size = (c / 64) * (0.14 + Math.random() * 0.1)
    gsap.timeline({ onComplete: () => s.destroy() })
      .to(s.scale, { x: size, y: size, duration: 0.22, ease: "back.out(3)" })
      .to(s, { rotation: 0.8, duration: 0.5, ease: "none" }, 0)
      .to(s.scale, { x: 0, y: 0, duration: 0.28, ease: "power2.in" }, 0.3)
  }

  private glitch(seconds: number, power: number) {
    if (!quality.fancy) return
    const f = new RGBSplitFilter({ red: { x: -power, y: 0 }, green: { x: 0, y: power / 2 }, blue: { x: power, y: 0 } })
    this.view.filters = [f]
    gsap.delayedCall(seconds, () => { if (this.view.filters?.[0] === f) this.view.filters = [] })
  }

  pop(x: number, y: number, color: number, cascade: number) {
    this.bursts.burst(x, y, color, 0.8 + cascade * 0.15)
    const now = performance.now()
    if (now - this.lastPop > 45) { this.lastPop = now; sfx.pop(cascade) }
  }

  blast(special: string, x: number, y: number, area: { x: number; y: number }[]) {
    const w = this.view.cell * 7, h = this.view.cell * 8
    if (special === "row" || special === "col") {
      const horizontal = special === "row"
      beam(this.layer, horizontal ? w / 2 : x, horizontal ? y : h / 2, horizontal ? w + 40 : h + 40, horizontal, 0x7df9ff, this.view.cell * 0.55)
      if (horizontal) this.bursts.line(0, y, w, y, 0x7df9ff); else this.bursts.line(x, 0, x, h, 0x7df9ff)
      sfx.special(); shake(this.shakeTarget, 9)
    } else if (special === "notify") {
      ring(this.layer, x, y, 0xffe600, this.view.cell * 1.9, 10)
      ring(this.layer, x, y, 0xffffff, this.view.cell * 1.3, 5)
      this.bursts.burst(x, y, 0xffe600, 2.2)
      this.shockwave(x, y)
      sfx.boom(); shake(this.shakeTarget, 16)
    } else if (special === "kep") {
      for (const p of area) bolt(this.layer, x, y, p.x, p.y, 0xc89bff)
      const s = this.screen()
      flash(this.screenLayer, s.w, s.h, 0xffffff, 0.45)
      slowMo(0.6)
      sfx.special(); shake(this.shakeTarget, 12)
    } else if (special === "police") {
      const s = this.screen()
      flash(this.screenLayer, s.w, s.h, 0x2f6bff, 0.35)
      gsap.delayedCall(0.12, () => flash(this.screenLayer, s.w, s.h, 0xff2a4a, 0.3))
      ring(this.layer, x, y, 0x5bb6ff, this.view.cell * 3, 12)
      for (const p of area) bolt(this.layer, x, y, p.x, p.y, 0x5bb6ff)
      popText(this.layer, "Кіберполіція!", w / 2, y, 30)
      sfx.special(); shake(this.shakeTarget, 10)
    }
  }

  private shockwave(x: number, y: number) {
    if (!quality.fancy) return
    const g = this.view.toGlobal({ x, y })
    const f = new ShockwaveFilter({ center: { x: g.x, y: g.y }, amplitude: 22, wavelength: 90, speed: 520, brightness: 1.15, radius: -1 })
    const stage = this.shakeTarget
    stage.filters = [...(stage.filters ?? []), f]
    gsap.to(f, { time: 1.1, duration: 0.9, ease: "none", onComplete: () => { stage.filters = (stage.filters ?? []).filter((x) => x !== f) } })
  }

  fakeHit(x: number, y: number, destroyed: boolean) {
    if (destroyed) {
      this.bursts.burst(x, y, MAGENTA, 1.4)
      ring(this.layer, x, y, MAGENTA, this.view.cell * 0.9, 6)
      sfx.fakeDie()
      this.glitch(0.12, 6)
    } else sfx.fake()
  }

  score(x: number, y: number, value: number, cascade: number) {
    if (value <= 0) return
    popText(this.layer, "+" + value, x, y + this.view.cell * 0.4, 20 + Math.min(cascade, 5) * 3, "#ffffff")
    comboMeter(cascade + 1)
  }

  multi(points: { x: number; y: number }[]) {
    for (const p of points) ring(this.layer, p.x, p.y, 0xffe14d, this.view.cell * 1.6, 8)
    const s = this.screen()
    flash(this.screenLayer, s.w, s.h, 0xffd6f0, 0.4)
    popText(this.layer, "МУЛЬТИВИБУХ!", this.view.cell * 3.5, this.view.cell * 2.2, 36)
    const g = this.view.toGlobal(points[0])
    if (!quality.reducedMotion) this.coins.fountain(g.x, g.y, 18)
    sfx.boom(); sfx.win()
    shake(this.shakeTarget, 14)
  }

  /** Called once per move: resets the jackpot latch and the combo meter. */
  moveDone() { this.jackpotMove = false; comboMeter(0) }

  jackpot() {
    if (this.jackpotMove) return
    this.jackpotMove = true
    const s = this.screen()
    flash(this.screenLayer, s.w, s.h, 0xffe14d, 0.45)
    popText(this.layer, "ДЖЕКПОТ!", this.view.cell * 3.5, this.view.cell * 3.2, 52, RAINBOW())
    if (!quality.reducedMotion) this.coins.rain(s.w, 0, 70)
    slowMo(0.7)
    sfx.win()
  }

  step(cascade: number, cleared: number, x: number, y: number) {
    if (cascade >= 4) this.jackpot()
    const text = COMBO[Math.min(cascade, COMBO.length - 1)] || (cleared >= 5 ? "Чудово!" : "")
    if (text) popText(this.layer, text, Math.min(Math.max(x, 90), this.view.cell * 7 - 90), y, cascade >= 3 ? 40 : 32)
    if (cleared >= 4 || cascade >= 2) shake(this.shakeTarget, 4 + cascade * 3)
    if (cascade >= 3) slowMo(0.45)
  }

  infect(x: number, y: number) {
    ring(this.layer, x, y, MAGENTA, this.view.cell * 0.8, 6)
    this.bursts.burst(x, y, MAGENTA, 0.7)
    this.glitch(0.18, 8)
    sfx.fake()
  }

  reveal(x: number, y: number) {
    this.bursts.burst(x, y, 0x00f0ff, 1.2)
    ring(this.layer, x, y, 0xff3bd4, this.view.cell * 1.1, 6)
    popText(this.layer, "Підробка!", x, y - this.view.cell * 0.6, 24, "#ff7ad9")
    this.glitch(0.25, 10)
    sfx.fake()
  }

  combo(x: number, y: number) {
    popText(this.layer, "Супер-комбо!", Math.min(Math.max(x, 110), this.view.cell * 7 - 110), y, 38)
    this.jackpot()
    slowMo(0.5)
    shake(this.shakeTarget, 14)
  }

  confetti() {
    const s = this.screen()
    this.bursts.confetti(this.view.cell * 7, [0xff5c9a, 0xffe14d, 0x5ff2b6, 0x7ab8ff, 0xc77aff, 0xffffff])
    void s
  }
}
