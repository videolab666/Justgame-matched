import { gsap } from "gsap"
import { Container, FillGradient, Graphics, Text } from "pixi.js"
import { quality } from "./quality"

const bases = new WeakMap<Container, { x: number; y: number }>()

/** Screen shake that always returns to the resting position. */
export function shake(target: Container, strength: number) {
  if (quality.reducedMotion) return
  if (!bases.has(target)) bases.set(target, { x: target.x, y: target.y })
  const base = bases.get(target)!
  gsap.killTweensOf(target, "x,y")
  const tl = gsap.timeline({ onComplete: () => { target.position.set(base.x, base.y); bases.delete(target) } })
  const n = 7
  for (let k = 0; k < n; k++) {
    const f = strength * (1 - k / n)
    tl.to(target, { x: base.x + (Math.random() - 0.5) * 2 * f, y: base.y + (Math.random() - 0.5) * 2 * f, duration: 0.035, ease: "none" })
  }
  tl.to(target, { x: base.x, y: base.y, duration: 0.05 })
}

/** Update the shake rest position after a layout change. */
export function setRest(target: Container) { bases.delete(target) }

/** Brief global slow motion (GSAP time scale); particles read it too. */
export function slowMo(seconds: number) {
  if (quality.reducedMotion) return
  gsap.killTweensOf(gsap.globalTimeline)
  gsap.globalTimeline.timeScale(0.3)
  gsap.to(gsap.globalTimeline, { timeScale: 1, duration: seconds, delay: 0.05, ease: "power2.in", overwrite: true })
}

const COMBO_FILL = () => new FillGradient({ type: "linear", start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, colorStops: [
  { offset: 0, color: "#fff7b0" }, { offset: 0.5, color: "#ffd02a" }, { offset: 1, color: "#ff7a1a" },
] })

/** Big popping text that floats up and fades. */
export function popText(layer: Container, text: string, x: number, y: number, size = 34, fill: string | FillGradient = COMBO_FILL()) {
  const t = new Text({ text, style: {
    fontFamily: "Unbounded, Arial Black, sans-serif", fontWeight: "900", fontSize: size, fill,
    stroke: { color: "#2a0b4f", width: Math.max(4, size / 6), join: "round" },
    dropShadow: { color: "#000000", alpha: 0.45, blur: 4, distance: 4, angle: Math.PI / 2 },
    align: "center",
  } })
  t.anchor.set(0.5)
  t.position.set(x, y)
  t.scale.set(0.2)
  t.rotation = (Math.random() - 0.5) * 0.25
  layer.addChild(t)
  gsap.timeline({ onComplete: () => t.destroy() })
    .to(t.scale, { x: 1, y: 1, duration: 0.35, ease: "back.out(3)" })
    .to(t, { rotation: 0, duration: 0.3 }, "<")
    .to(t, { y: y - 46, alpha: 0, duration: 0.55, ease: "power1.in" }, "+=0.35")
}

/** Expanding ring. */
export function ring(layer: Container, x: number, y: number, color: number, radius: number, width = 8) {
  const g = new Graphics().circle(0, 0, radius).stroke({ color, width, alpha: 1 })
  g.position.set(x, y)
  g.scale.set(0.15)
  g.blendMode = "add"
  layer.addChild(g)
  gsap.to(g.scale, { x: 1, y: 1, duration: 0.45, ease: "power2.out" })
  gsap.to(g, { alpha: 0, duration: 0.45, ease: "power1.in", onComplete: () => g.destroy() })
}

/** Glowing beam (2FA). */
export function beam(layer: Container, x: number, y: number, length: number, horizontal: boolean, color: number, thickness: number) {
  const g = new Graphics()
  for (const [w, a] of [[thickness * 2.2, 0.25], [thickness, 0.6], [thickness * 0.35, 1]] as const) {
    if (horizontal) g.rect(-length / 2, -w / 2, length, w).fill({ color: a === 1 ? 0xffffff : color, alpha: a })
    else g.rect(-w / 2, -length / 2, w, length).fill({ color: a === 1 ? 0xffffff : color, alpha: a })
  }
  g.position.set(x, y)
  g.blendMode = "add"
  if (horizontal) g.scale.set(0.05, 1); else g.scale.set(1, 0.05)
  layer.addChild(g)
  gsap.timeline({ onComplete: () => g.destroy() })
    .to(g.scale, { x: 1, y: 1, duration: 0.14, ease: "power3.out" })
    .to(g.scale, horizontal ? { y: 0, duration: 0.25, ease: "power2.in" } : { x: 0, duration: 0.25, ease: "power2.in" }, "+=0.05")
}

/** Zig-zag lightning bolt (KEP). */
export function bolt(layer: Container, x0: number, y0: number, x1: number, y1: number, color: number) {
  const g = new Graphics()
  const pts: number[] = [x0, y0]
  const n = 6
  for (let k = 1; k < n; k++) {
    const t = k / n
    pts.push(x0 + (x1 - x0) * t + (Math.random() - 0.5) * 18, y0 + (y1 - y0) * t + (Math.random() - 0.5) * 18)
  }
  pts.push(x1, y1)
  g.poly(pts, false).stroke({ color, width: 6, alpha: 0.5 }).poly(pts, false).stroke({ color: 0xffffff, width: 2 })
  g.blendMode = "add"
  layer.addChild(g)
  gsap.to(g, { alpha: 0, duration: 0.4, delay: 0.1, onComplete: () => g.destroy() })
}

/** Full-screen colour flash. */
export function flash(layer: Container, w: number, h: number, color: number, alpha = 0.35) {
  const g = new Graphics().rect(0, 0, w, h).fill({ color, alpha })
  g.blendMode = "add"
  layer.addChild(g)
  gsap.to(g, { alpha: 0, duration: 0.35, ease: "power2.out", onComplete: () => g.destroy() })
}
