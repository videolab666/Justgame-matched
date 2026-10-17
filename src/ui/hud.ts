import { KIND_NAMES } from "../logic/cells"
import type { LevelState } from "../logic/level"
import { svgUrl } from "../render/textures"
import { el, esc } from "./text"

/** Top bar: moves, goals (remaining counts), score bar with star marks. */
export function mountHud(root: HTMLElement, onSettings: () => void) {
  const hud = el("div", "hud")
  hud.innerHTML = `<div class="moves"><div><b>0</b><small>ХОДИ</small></div></div>
    <div class="mid"><div class="title"></div><div class="goals"></div><div class="scorebar"><div class="fill"></div></div></div>
    <div class="score"><span>0</span><small>очки</small></div>`
  const gear = el("button", "gear", "⚙️")
  gear.setAttribute("aria-label", "Налаштування")
  gear.onclick = onSettings
  root.append(hud, gear)
  const q = <T extends Element>(s: string) => hud.querySelector(s) as T
  let last: number[] = []
  return {
    update(s: LevelState) {
      q<HTMLElement>(".moves b").textContent = String(s.movesLeft)
      q<HTMLElement>(".moves").classList.toggle("low", s.movesLeft <= 4 && s.status === "playing")
      q<HTMLElement>(".title").textContent = `${s.def.id} · ${s.def.title}`
      q<HTMLElement>(".score span").textContent = String(s.score)
      const goals = q<HTMLElement>(".goals")
      if (goals.children.length !== s.def.goals.length) {
        goals.innerHTML = s.def.goals.map((g) => {
          const icon = g.type === "fakes" ? "fake-sms" : KIND_NAMES[g.kind]
          return `<div class="goal"><img src="${svgUrl(icon)}" alt=""><span></span></div>`
        }).join("")
        last = []
      }
      s.def.goals.forEach((g, k) => {
        const left = Math.max(0, g.n - s.progress[k])
        const chip = goals.children[k] as HTMLElement
        chip.querySelector("span")!.textContent = left ? String(left) : "✓"
        chip.classList.toggle("done", left === 0)
        if (last[k] !== undefined && last[k] !== s.progress[k]) {
          chip.classList.add("bump")
          setTimeout(() => chip.classList.remove("bump"), 180)
        }
      })
      last = s.progress.slice()
      const max = s.def.stars[2] * 1.15
      const bar = q<HTMLElement>(".scorebar")
      q<HTMLElement>(".fill").style.width = `${Math.min(100, (s.score / max) * 100)}%`
      if (!bar.querySelector(".star")) {
        bar.insertAdjacentHTML("beforeend", [s.def.stars[1], s.def.stars[2]].map((v) =>
          `<span class="star" style="left:${(v / max) * 100}%">⭐</span>`).join(""))
      }
      bar.querySelectorAll<HTMLElement>(".star").forEach((st, k) => st.classList.toggle("on", s.score >= s.def.stars[k + 1]))
    },
    resetStars() { hud.querySelectorAll(".scorebar .star").forEach((x) => x.remove()) },
    destroy() { hud.remove(); gear.remove() },
    title: (t: string) => { q<HTMLElement>(".title").textContent = esc(t) },
  }
}
