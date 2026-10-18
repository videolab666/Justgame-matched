import { gsap } from "gsap"

let el: HTMLElement | null = null
let hideTimer = 0

/** Casino-style multiplier badge under the HUD: «x2», «x3»… rolls up like a
 * slot reel on every cascade; `0` hides it. */
export function comboMeter(mult: number) {
  if (!el) {
    el = document.createElement("div")
    el.className = "combo-meter"
    el.innerHTML = "<span></span>"
    document.getElementById("ui")?.append(el)
  }
  const span = el.querySelector("span")!
  clearTimeout(hideTimer)
  if (mult < 2) {
    hideTimer = window.setTimeout(() => el && gsap.to(el, { opacity: 0, scale: 0.6, duration: 0.25 }), 500)
    return
  }
  el.dataset.level = String(Math.min(mult, 8))
  gsap.to(el, { opacity: 1, scale: 1, duration: 0.15 })
  gsap.fromTo(span, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.22, ease: "back.out(2.5)" })
  span.textContent = "x" + mult
  gsap.fromTo(el, { scale: 1.35 }, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.5)" })
}
