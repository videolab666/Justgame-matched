import { Particle, ParticleContainer, type Texture } from "pixi.js"
import { quality } from "./quality"

type Live = { p: Particle; vx: number; vy: number; life: number; max: number; spin: number; s0: number; drag: number; g: number }

/** Lightweight burst emitter on Pixi v8's ParticleContainer. */
export class Bursts {
  readonly view: ParticleContainer
  private live: Live[] = []
  constructor(private tex: Texture, additive = true) {
    this.view = new ParticleContainer({ texture: tex, dynamicProperties: { position: true, rotation: true, vertex: true, color: true } })
    if (additive) this.view.blendMode = "add"
  }

  /** Gold coins: a fountain from a point (big wins). */
  fountain(x: number, y: number, n: number) {
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6
      this.spawn(x, y, 0xffffff, a, 260 + Math.random() * 320, 0.32 + Math.random() * 0.22, 1.1 + Math.random() * 0.5, 900, 0.4)
    }
  }

  /** Gold coins raining over a width (jackpot). */
  rain(width: number, top: number, n: number) {
    for (let k = 0; k < n; k++) {
      this.spawn(Math.random() * width, top - Math.random() * 260, 0xffffff, Math.PI / 2 + (Math.random() - 0.5) * 0.3,
        120 + Math.random() * 200, 0.3 + Math.random() * 0.25, 2 + Math.random(), 500, 0.2)
    }
  }

  private spawn(x: number, y: number, color: number, angle: number, speed: number, size: number, life: number, g: number, drag: number) {
    if (this.live.length >= quality.maxParticles) return
    const p = new Particle({ texture: this.tex, x, y, anchorX: 0.5, anchorY: 0.5, tint: color, scaleX: size, scaleY: size })
    this.view.addParticle(p)
    this.live.push({ p, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, max: life, spin: (Math.random() - 0.5) * 8, s0: size, drag, g })
  }

  /** Coloured sparks plus a few bright white ones; `power` scales count/speed. */
  burst(x: number, y: number, color: number, power = 1) {
    const n = Math.round((quality.heavy ? 14 : 6) * power)
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2
      this.spawn(x, y, color, a, 120 + Math.random() * 260 * power, 0.35 + Math.random() * 0.45, 0.45 + Math.random() * 0.35, 520, 2.2)
    }
    for (let k = 0; k < Math.ceil(n / 4); k++) {
      this.spawn(x, y, 0xffffff, Math.random() * Math.PI * 2, 60 + Math.random() * 120, 0.5, 0.3, 0, 4)
    }
  }

  /** Sparks along a line (2FA beams, KEP lightning). */
  line(x0: number, y0: number, x1: number, y1: number, color: number) {
    const n = quality.heavy ? 28 : 10
    for (let k = 0; k < n; k++) {
      const t = k / n
      const a = Math.random() * Math.PI * 2
      this.spawn(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, color, a, 40 + Math.random() * 140, 0.3 + Math.random() * 0.3, 0.35 + Math.random() * 0.3, 100, 3)
    }
  }

  /** Confetti rain for the win screen. */
  confetti(width: number, colors: number[]) {
    for (let k = 0; k < (quality.heavy ? 120 : 40); k++) {
      this.spawn(Math.random() * width, -20 - Math.random() * 200, colors[k % colors.length], Math.PI / 2 + (Math.random() - 0.5) * 0.6,
        80 + Math.random() * 160, 0.4 + Math.random() * 0.4, 2.5 + Math.random(), 60, 0.3)
    }
  }

  update(dt: number) {
    for (let k = this.live.length - 1; k >= 0; k--) {
      const l = this.live[k]
      l.life -= dt
      if (l.life <= 0) { this.view.removeParticle(l.p); this.live.splice(k, 1); continue }
      const f = Math.max(0, 1 - l.drag * dt)
      l.vx *= f; l.vy = l.vy * f + l.g * dt
      l.p.x += l.vx * dt; l.p.y += l.vy * dt
      l.p.rotation += l.spin * dt
      const t = l.life / l.max
      l.p.alpha = Math.min(1, t * 1.6)
      l.p.scaleX = l.p.scaleY = l.s0 * (0.4 + 0.6 * t)
    }
  }
}
