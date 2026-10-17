import { gsap } from "gsap"
import { RGBSplitFilter, ShockwaveFilter } from "pixi-filters"
import { Container, type Texture } from "pixi.js"
import { sfx } from "../audio/sfx"
import type { BoardFx, BoardView } from "../render/board-view"
import { Bursts } from "./particles"
import { beam, bolt, flash, popText, ring, shake, slowMo } from "./juice"
import { quality } from "./quality"

const COMBO = ["", "Супер!", "Схему зламано!", "Мега-комбо!", "Кібергерой!"]
const MAGENTA = 0xff3bd4

/** Wires board events to particles, filters, screen juice and sound. */
export class BoardEffects implements BoardFx {
  readonly layer = new Container()
  private bursts: Bursts
  private lastPop = 0
  private glitchAt = 0

  constructor(private view: BoardView, private shakeTarget: Container, tex: Record<string, Texture>, private screen: () => { w: number; h: number }, private screenLayer: Container) {
    this.bursts = new Bursts(tex.spark)
    this.layer.addChild(this.bursts.view)
    view.addChild(this.layer)
  }

  update(dt: number, now: number) {
    this.bursts.update(dt)
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

  step(cascade: number, cleared: number, x: number, y: number) {
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

  confetti() {
    const s = this.screen()
    this.bursts.confetti(this.view.cell * 7, [0xff3b5c, 0xffe600, 0x3bff9a, 0x3bc8ff, 0xc03bff])
    void s
  }
}
