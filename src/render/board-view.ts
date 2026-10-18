import { gsap } from "gsap"
import { Container, Graphics, Rectangle, Sprite, type FederatedPointerEvent, type Texture } from "pixi.js"
import { isFake, isTile, type Cell } from "../logic/cells"
import { areNeighbors, rc, type Grid } from "../logic/grid"
import type { Board, Step } from "../logic/resolve"
import { KIND_COLORS, TILE_TEXTURES } from "./textures"

/** Effects the board asks for; the fx layer fills these in (no-ops by default). */
export type BoardFx = {
  pop(x: number, y: number, color: number, cascade: number): void
  blast(special: string, x: number, y: number, area: { x: number; y: number }[]): void
  fakeHit(x: number, y: number, destroyed: boolean): void
  step(cascade: number, cleared: number, x: number, y: number): void
  infect(x: number, y: number): void
  reveal(x: number, y: number): void
  combo(x: number, y: number): void
}
const NO_FX: BoardFx = { pop() {}, blast() {}, fakeHit() {}, step() {}, infect() {}, reveal() {}, combo() {} }

const OVERLAY: Record<string, string> = { row: "fx-row", col: "fx-col", notify: "fx-notify", kep: "fx-kep", police: "fx-police" }

class TileSprite extends Container {
  base: Sprite
  overlay?: Sprite
  wobble?: gsap.core.Tween
  constructor(private tex: Record<string, Texture>, public cell: Cell, size: number) {
    super()
    this.base = new Sprite(this.textureFor(cell))
    this.base.anchor.set(0.5)
    this.addChild(this.base)
    this.setCell(cell, size)
  }
  textureFor(c: Cell): Texture {
    if (isFake(c)) {
      if (c.fake === "ad") return this.tex[c.hp > 1 ? "fake-ad" : "fake-ad-cracked"]
      if (c.fake === "call") return this.tex["fake-call"]
      if (c.fake === "forgery") return c.revealed ? this.tex["fake-forgery"] : this.tex[TILE_TEXTURES[c.disguise ?? 0]]
      return this.tex["fake-sms"]
    }
    return this.tex[c.special === "kep" ? "fx-kep" : TILE_TEXTURES[c.kind]]
  }
  setCell(c: Cell, size: number) {
    this.cell = c
    this.base.texture = this.textureFor(c)
    const s = size * 0.86
    this.base.width = this.base.height = s
    const masked = isFake(c) && c.fake === "forgery" && !c.revealed
    const name = masked ? "fx-mask" : isTile(c) && c.special && c.special !== "kep" ? OVERLAY[c.special] : undefined
    if (name && !this.overlay) {
      this.overlay = new Sprite(this.tex[name])
      this.overlay.anchor.set(0.5)
      this.addChild(this.overlay)
    }
    if (this.overlay) {
      this.overlay.visible = !!name
      if (name) { this.overlay.texture = this.tex[name]; this.overlay.width = this.overlay.height = size * 0.98 }
    }
    // A call rings: a gentle wobble that stops once the cell is something else.
    const ringing = isFake(c) && c.fake === "call"
    if (ringing && !this.wobble) this.wobble = gsap.to(this.base, { rotation: 0.14, duration: 0.09, yoyo: true, repeat: -1, repeatDelay: 0.6, ease: "sine.inOut" })
    if (!ringing && this.wobble) { this.wobble.kill(); this.wobble = undefined; this.base.rotation = 0 }
  }
}

const tween = (target: object, vars: gsap.TweenVars) =>
  new Promise<void>((done) => gsap.to(target, { ...vars, onComplete: () => done() }))

export class BoardView extends Container {
  onSwap: (a: number, b: number) => void = () => {}
  fx: BoardFx = NO_FX
  locked = false
  cell = 48
  private cells: (Cell | null)[] = []
  private sprites = new Map<number, TileSprite>()
  private slots = new Graphics()
  private layer = new Container()
  private maskG = new Graphics()
  private selected = -1
  private press: { i: number; x: number; y: number } | null = null

  constructor(private tex: Record<string, Texture>, private g: Grid) {
    super()
    this.addChild(this.slots, this.layer, this.maskG)
    this.layer.mask = this.maskG
    this.eventMode = "static"
    this.on("pointerdown", (e) => this.down(e))
    this.on("pointermove", (e) => this.move(e))
    this.on("pointerup", () => (this.press = null))
    this.on("pointerupoutside", () => (this.press = null))
  }

  /** Sprites currently showing fakes (for idle glitch effects). */
  fakeSprites(): Container[] {
    const out: Container[] = []
    for (const c of this.cells) if (isFake(c)) { const s = this.sprites.get(c.id); if (s) out.push(s) }
    return out
  }

  /** Cell centre in board-local pixels. */
  pos(i: number) {
    const { r, c } = rc(this.g, i)
    return { x: (c + 0.5) * this.cell, y: (r + 0.5) * this.cell }
  }

  layout(cell: number) {
    this.cell = cell
    const w = this.g.w * cell, h = this.g.h * cell
    this.hitArea = new Rectangle(0, 0, w, h)
    this.slots.clear()
    for (let i = 0; i < this.g.w * this.g.h; i++) {
      const { r, c } = rc(this.g, i)
      const x = c * cell + 3, y = r * cell + 3, s = cell - 6
      this.slots.roundRect(x, y, s, s, cell * 0.26)
        .fill({ color: (r + c) % 2 ? 0x5a2fb8 : 0x6b3ccf, alpha: 0.55 })
        .stroke({ color: 0xffc8f0, alpha: 0.18, width: 2 })
      this.slots.roundRect(x + s * 0.14, y + s * 0.07, s * 0.72, s * 0.13, s * 0.07).fill({ color: 0xffffff, alpha: 0.09 })
    }
    this.maskG.clear().rect(-cell, -cell * 0.35, w + 2 * cell, h + cell * 1.35).fill(0xffffff)
    for (const [, s] of this.sprites) s.setCell(s.cell, cell)
    this.cells.forEach((c, i) => { if (c) { const s = this.sprites.get(c.id)!; const p = this.pos(i); s.position.set(p.x, p.y) } })
  }

  /** Reconcile sprites with a board. With `animate`, moved sprites glide
   * (shuffle) and new ones pop in (infection, penalty fakes, boosters). */
  async setBoard(b: Board, animate = false) {
    const keep = new Set(b.cells.map((c) => c.id))
    for (const [id, s] of this.sprites) if (!keep.has(id)) {
      this.sprites.delete(id)
      if (animate) gsap.to(s.scale, { x: 0, y: 0, duration: 0.2, onComplete: () => s.destroy() })
      else s.destroy()
    }
    this.cells = b.cells.slice()
    const moves: Promise<void>[] = []
    b.cells.forEach((c, i) => {
      let s = this.sprites.get(c.id)
      const p = this.pos(i)
      const fresh = !s
      if (!s) { s = new TileSprite(this.tex, c, this.cell); this.sprites.set(c.id, s); this.layer.addChild(s) }
      else s.setCell(c, this.cell)
      gsap.killTweensOf(s); gsap.killTweensOf(s.scale)
      s.alpha = 1; s.rotation = 0
      if (!animate) { s.position.set(p.x, p.y); s.scale.set(1); return }
      if (fresh) {
        s.position.set(p.x, p.y)
        moves.push(tween(s.scale, { startAt: { x: 0, y: 0 }, x: 1, y: 1, duration: 0.45, ease: "elastic.out(1, 0.45)" }))
        if (isFake(c)) this.fx.infect(p.x, p.y)
      } else if (Math.abs(s.x - p.x) > 1 || Math.abs(s.y - p.y) > 1) {
        moves.push(tween(s, { x: p.x, y: p.y, duration: 0.4, ease: "power3.inOut" }))
      } else s.scale.set(1)
    })
    await Promise.all(moves)
  }

  // ---- input ---------------------------------------------------------------
  private indexAt(e: FederatedPointerEvent) {
    const p = this.toLocal(e.global)
    const c = Math.floor(p.x / this.cell), r = Math.floor(p.y / this.cell)
    if (c < 0 || r < 0 || c >= this.g.w || r >= this.g.h) return -1
    return r * this.g.w + c
  }
  private down(e: FederatedPointerEvent) {
    if (this.locked) return
    const i = this.indexAt(e)
    if (i < 0) return
    const p = this.toLocal(e.global)
    if (this.selected >= 0 && this.selected !== i && areNeighbors(this.g, this.selected, i)) {
      const a = this.selected
      this.select(-1)
      this.onSwap(a, i)
      return
    }
    this.select(i)
    this.press = { i, x: p.x, y: p.y }
  }
  private move(e: FederatedPointerEvent) {
    if (!this.press || this.locked) return
    const p = this.toLocal(e.global)
    const dx = p.x - this.press.x, dy = p.y - this.press.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < this.cell * 0.35) return
    const { r, c } = rc(this.g, this.press.i)
    const [tr, tc] = Math.abs(dx) > Math.abs(dy) ? [r, c + Math.sign(dx)] : [r + Math.sign(dy), c]
    const a = this.press.i
    this.press = null
    this.select(-1)
    if (tr < 0 || tc < 0 || tr >= this.g.h || tc >= this.g.w) return
    this.onSwap(a, tr * this.g.w + tc)
  }
  private select(i: number) {
    const old = this.cells[this.selected]
    if (old) { const s = this.sprites.get(old.id); if (s) { gsap.killTweensOf(s.scale); gsap.to(s.scale, { x: 1, y: 1, duration: 0.12 }) } }
    this.selected = i
    const c = this.cells[i]
    if (c) {
      const s = this.sprites.get(c.id)!
      gsap.to(s.scale, { x: 1.12, y: 1.12, duration: 0.35, yoyo: true, repeat: -1, ease: "sine.inOut" })
    }
  }

  // ---- animation -----------------------------------------------------------
  private spriteAt(i: number) { const c = this.cells[i]; return c ? this.sprites.get(c.id) : undefined }

  async shakeInvalid(a: number, b: number) {
    const sa = this.spriteAt(a), sb = this.spriteAt(b)
    if (!sa || !sb) return
    const pa = this.pos(a), pb = this.pos(b)
    await Promise.all([
      tween(sa, { x: pa.x + (pb.x - pa.x) * 0.45, y: pa.y + (pb.y - pa.y) * 0.45, duration: 0.11, yoyo: true, repeat: 1, ease: "power2.out" }),
      tween(sb, { x: pb.x + (pa.x - pb.x) * 0.45, y: pb.y + (pa.y - pb.y) * 0.45, duration: 0.11, yoyo: true, repeat: 1, ease: "power2.out" }),
    ])
  }

  /** Swap animation, then every cascade step, then spread/shuffle extras. */
  async play(a: number, b: number, steps: Step[], extra: { infected?: { from: number; to: number }; shuffled?: Record<number, number> } = {}) {
    this.locked = true
    const sa = this.spriteAt(a), sb = this.spriteAt(b)
    const pa = this.pos(a), pb = this.pos(b)
    if (sa && sb) {
      await Promise.all([
        tween(sa, { x: pb.x, y: pb.y, duration: 0.16, ease: "power2.inOut" }),
        tween(sb, { x: pa.x, y: pa.y, duration: 0.16, ease: "power2.inOut" }),
      ])
      ;[this.cells[a], this.cells[b]] = [this.cells[b], this.cells[a]]
    }
    await this.playSteps(steps)
    await this.playExtra(extra)
    this.locked = false
  }

  async playSteps(steps: Step[]) {
    for (let k = 0; k < steps.length; k++) await this.playStep(steps[k], k)
  }

  private async playStep(st: Step, k: number) {
    const speed = 1 + k * 0.15
    // 1. new specials morph in place
    for (const cr of st.created) {
      const s = this.spriteAt(cr.index)
      const cell = this.cells[cr.index]
      if (!s || !isTile(cell)) continue
      const next: Cell = { ...cell, special: cr.special }
      this.cells[cr.index] = next
      s.setCell(next, this.cell)
      gsap.fromTo(s.scale, { x: 1.6, y: 1.6 }, { x: 1, y: 1, duration: 0.35, ease: "elastic.out(1, 0.5)" })
    }
    // 2. specials fire (two swapped specials = a combo)
    if (k === 0 && !st.matched.length && st.fired.length >= 2) {
      const p = this.pos(st.fired[0].index)
      this.fx.combo(p.x, p.y)
    }
    for (const f of st.fired) {
      const p = this.pos(f.index)
      this.fx.blast(f.special, p.x, p.y, f.area.map((i) => this.pos(i)))
    }
    // 3. cleared tiles pop
    const pops: Promise<void>[] = []
    let cx = 0, cy = 0
    st.cleared.forEach((i, n) => {
      const s = this.spriteAt(i)
      const p = this.pos(i)
      cx += p.x; cy += p.y
      this.fx.pop(p.x, p.y, KIND_COLORS[st.clearedKinds[n]], k)
      if (!s) return
      this.cells[i] = null
      this.sprites.delete(s.cell.id)
      pops.push(tween(s.scale, { x: 1.3, y: 1.3, duration: 0.07 / speed, ease: "power2.out" })
        .then(() => tween(s.scale, { x: 0, y: 0, duration: 0.13 / speed, ease: "back.in(2)" }))
        .then(() => s.destroy()))
    })
    if (st.cleared.length) this.fx.step(k, st.cleared.length, cx / st.cleared.length, cy / st.cleared.length)
    // 4. fakes take hits
    for (const h of st.fakesHit) {
      const s = this.spriteAt(h.index)
      const p = this.pos(h.index)
      this.fx.fakeHit(p.x, p.y, h.destroyed)
      if (!s) continue
      if (h.destroyed) {
        this.cells[h.index] = null
        this.sprites.delete(s.cell.id)
        pops.push(tween(s, { rotation: 0.6, duration: 0.18 }).then(() => s.destroy()))
        gsap.to(s.scale, { x: 1.5, y: 0, duration: 0.18, ease: "power3.in" })
      } else {
        const cell = this.cells[h.index]
        if (isFake(cell)) {
          const next = h.revealed ? { ...cell, revealed: true } : { ...cell, hp: cell.hp - 1 }
          this.cells[h.index] = next
          s.setCell(next, this.cell)
        }
        if (h.revealed) {
          this.fx.reveal(p.x, p.y)
          gsap.fromTo(s.scale, { x: 1.45, y: 1.45 }, { x: 1, y: 1, duration: 0.45, ease: "elastic.out(1, 0.4)" })
        } else gsap.fromTo(s, { x: p.x - 6 }, { x: p.x, duration: 0.25, ease: "elastic.out(1, 0.3)" })
      }
    }
    await Promise.all(pops)
    // 5. gravity and refill
    const falls: Promise<void>[] = []
    // Column state after gravity: moved targets take their sources.
    const settled: (Cell | null)[] = this.cells.slice()
    for (const from of Object.values(st.moved)) settled[from] = null
    for (const [toS, from] of Object.entries(st.moved)) settled[Number(toS)] = this.cells[from]
    for (const [toS, cell] of Object.entries(st.added)) {
      const to = Number(toS)
      settled[to] = cell
      const s = new TileSprite(this.tex, cell, this.cell)
      this.sprites.set(cell.id, s)
      this.layer.addChild(s)
      const p = this.pos(to)
      const missing = Object.keys(st.added).filter((x) => rc(this.g, Number(x)).c === rc(this.g, to).c).length
      s.position.set(p.x, p.y - missing * this.cell - this.cell * 0.6)
    }
    this.cells = settled
    this.cells.forEach((c, i) => {
      if (!c) return
      const s = this.sprites.get(c.id)
      if (!s) return
      const p = this.pos(i)
      const dist = (p.y - s.y) / this.cell
      if (dist <= 0.01) return
      const d = (0.12 + 0.045 * dist) / speed
      falls.push(tween(s, { y: p.y, x: p.x, duration: d, ease: "power2.in" }).then(() => this.land(s)))
    })
    await Promise.all(falls)
  }

  private land(s: TileSprite) {
    gsap.fromTo(s.scale, { x: 1.14, y: 0.82 }, { x: 1, y: 1, duration: 0.28, ease: "elastic.out(1, 0.45)" })
  }

  /** Spread and shuffle are shown by the caller's animated setBoard; here
   * the infection gets a "reach" from the source fake first. */
  private async playExtra(extra: { infected?: { from: number; to: number }; shuffled?: Record<number, number> }) {
    if (!extra.infected) return
    const src = this.spriteAt(extra.infected.from)
    if (!src) return
    const p = this.pos(extra.infected.to)
    const home = { x: src.x, y: src.y }
    await tween(src, { x: home.x + (p.x - home.x) * 0.35, y: home.y + (p.y - home.y) * 0.35, duration: 0.14, yoyo: true, repeat: 1, ease: "power2.inOut" })
  }
}
