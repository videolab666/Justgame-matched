import { gsap } from "gsap"
import { quality } from "../fx/quality"

const GLYPHS = ["✦", "★", "✧", "●", "✦"]
const COLORS = ["#ffffff", "#ffe14d", "#ff9ad1", "#7ab8ff", "#5ff2b6", "#c77aff"]

function layer(): HTMLElement {
  let l = document.getElementById("fx-dom")
  if (!l) {
    l = document.createElement("div")
    l.id = "fx-dom"
    document.body.append(l)
  }
  return l
}

/** DOM sparkle burst (buttons, verdicts, titles): stars fly out and fade. */
export function sparkleBurst(x: number, y: number, n = 14, spread = 90) {
  if (quality.reducedMotion) n = Math.min(n, 4)
  const l = layer()
  for (let k = 0; k < n; k++) {
    const s = document.createElement("span")
    s.className = "spark-dom"
    s.textContent = GLYPHS[k % GLYPHS.length]
    s.style.left = `${x}px`
    s.style.top = `${y}px`
    s.style.color = COLORS[(k * 7) % COLORS.length]
    s.style.fontSize = `${10 + Math.random() * 14}px`
    l.append(s)
    const a = (k / n) * Math.PI * 2 + Math.random() * 0.5
    const d = spread * (0.45 + Math.random() * 0.75)
    gsap.fromTo(s, { x: 0, y: 0, scale: 0.4, rotation: 0, opacity: 1 }, {
      x: Math.cos(a) * d, y: Math.sin(a) * d - 18, scale: 1.1, rotation: (Math.random() - 0.5) * 240,
      duration: 0.55 + Math.random() * 0.35, ease: "power3.out", onComplete: () => s.remove(),
    })
    gsap.to(s, { opacity: 0, scale: 0.2, duration: 0.35, delay: 0.4 + Math.random() * 0.25 })
  }
}

const centre = (e: Element) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }

/** Screen entrance: panel fades in, its parts pop in one after another,
 * the title drops with a bounce and sparkles. */
export function enterScreen(s: HTMLElement) {
  const kids = [...s.children] as HTMLElement[]
  gsap.fromTo(s, { opacity: 0 }, { opacity: 1, duration: 0.25 })
  if (quality.reducedMotion) return
  gsap.fromTo(kids, { opacity: 0, y: 36, scale: 0.75 }, {
    opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(1.9)", stagger: 0.06, clearProps: "transform,opacity",
  })
  const title = s.querySelector("h1")
  if (title) {
    gsap.fromTo(title, { y: -90, scale: 1.5, rotation: -7 }, { y: 0, scale: 1, rotation: 0, duration: 0.8, ease: "elastic.out(1, 0.55)", clearProps: "transform" })
    gsap.delayedCall(0.35, () => { const c = centre(title); sparkleBurst(c.x, c.y, 18, 140) })
  }
}

/** Screen exit: parts shrink away in a quick wave, then the panel fades. */
export function leaveScreen(s: HTMLElement): Promise<void> {
  return new Promise((done) => {
    if (quality.reducedMotion) { done(); return }
    gsap.to([...s.children], { opacity: 0, y: -26, scale: 0.85, duration: 0.2, stagger: 0.025, ease: "power2.in" })
    gsap.to(s, { opacity: 0, duration: 0.24, delay: 0.12, onComplete: () => done() })
  })
}

/** Sparkles on every tap of a candy button. */
export function wireButtonSparkles() {
  addEventListener("pointerdown", (e) => {
    const b = (e.target as Element | null)?.closest?.(".big, .lvl:not(.locked), .scam-actions button, .gear, .arrow")
    if (b) sparkleBurst(e.clientX, e.clientY, 9, 55)
  })
}

export { centre }
