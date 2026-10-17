import { sfx } from "../audio/sfx"
import type { Channel, Scam } from "../content/types"
import { el, esc, highlight } from "./text"

const CHANNEL: Record<Channel, [string, string]> = {
  sms: ["💬", "SMS"], viber: ["🟣", "Viber"], telegram: ["✈️", "Telegram"], call: ["📞", "Дзвінок"],
  olx: ["🛒", "Оголошення"], diia: ["🏛️", "Дія"], instagram: ["📸", "Instagram"], game: ["🎮", "Гра"],
}

export type ScamAnswer = { answer: "fake" | "real" | "timeout"; correct: boolean }

/** Messenger-style card over the board. Swipe left = «Фейк», right =
 * «Справжнє» (or tap the buttons). Resolves after the verdict is shown;
 * `rewardText` describes what the answer earned on the board. */
export function showScam(root: HTMLElement, scam: Scam, seconds: number, rewardText: (r: ScamAnswer) => string): Promise<ScamAnswer> {
  return new Promise((resolve) => {
    const back = el("div", "scam-back")
    const [icon, label] = CHANNEL[scam.channel]
    back.innerHTML = `<div class="scam-top">Нове повідомлення!<small>Фейк чи справжнє? Свайпни або натисни</small></div>`
    const wrap = el("div")
    const card = el("div", "scam-card")
    card.innerHTML = `
      <svg class="timer" viewBox="0 0 46 46"><circle cx="23" cy="23" r="20"/><circle class="arc" cx="23" cy="23" r="20"/><text x="23" y="23">${seconds}</text></svg>
      <div class="who"><div class="ava">${icon}</div><div><b>${esc(scam.sender)}</b><small>${label}</small></div></div>
      <div class="bubble ${scam.channel === "call" ? "call" : ""}">${scam.channel === "call" ? "🔊 " : ""}${esc(scam.text)}</div>
      <div class="stamp fake">ФЕЙК</div><div class="stamp real">СПРАВЖНЄ</div>`
    const actions = el("div", "scam-actions", `<button class="fake">← Фейк</button><button class="real">Справжнє →</button>`)
    wrap.append(card, actions)
    back.append(wrap)
    root.append(back)
    card.animate([{ transform: "translateY(-120px) scale(.6) rotate(-8deg)", opacity: 0 }, { transform: "none", opacity: 1 }],
      { duration: 420, easing: "cubic-bezier(.2,1.4,.4,1)" })
    if (scam.channel === "call") card.animate([{ transform: "rotate(-1.5deg)" }, { transform: "rotate(1.5deg)" }], { duration: 90, iterations: 8, direction: "alternate", delay: 420 })
    sfx.whoosh()

    const arc = card.querySelector(".arc") as SVGCircleElement
    const num = card.querySelector(".timer text") as SVGTextElement
    const len = 2 * Math.PI * 20
    arc.style.strokeDasharray = String(len)
    const stampF = card.querySelector(".stamp.fake") as HTMLElement
    const stampR = card.querySelector(".stamp.real") as HTMLElement
    const start = performance.now()
    let done = false, lastSec = seconds, raf = 0

    const finish = (answer: ScamAnswer["answer"]) => {
      if (done) return
      done = true
      cancelAnimationFrame(raf)
      const correct = answer !== "timeout" && (answer === "fake") === scam.isFake
      const dir = answer === "fake" ? -1 : answer === "real" ? 1 : 0
      card.style.transition = "transform .35s cubic-bezier(.5,0,.75,0), opacity .35s"
      card.style.transform = dir ? `translateX(${dir * 140}vw) rotate(${dir * 35}deg)` : "scale(.4)"
      card.style.opacity = "0"
      actions.style.opacity = "0"
      if (correct) sfx.good(); else sfx.bad()
      const r: ScamAnswer = { answer, correct }
      const title = answer === "timeout" ? "⏰ Час вийшов!" : correct ? (scam.isFake ? "✓ Так, це фейк!" : "✓ Так, це справжнє!")
        : (scam.isFake ? "✗ Ой! Це був фейк" : "✗ Ні, це було справжнє")
      const v = el("div", `verdict ${correct ? "good" : "bad"}`)
      v.innerHTML = `<h3>${title}</h3>
        ${!correct && scam.isFake ? `<div class="scam-card" style="width:auto;margin:8px 0;box-shadow:none"><div class="bubble">${highlight(scam.text, scam.flags)}</div></div>` : ""}
        <div>${esc(scam.explain)}</div><div class="reward">${esc(rewardText(r))}</div>`
      setTimeout(() => {
        wrap.remove()
        back.append(v)
        const close = () => { back.remove(); resolve(r) }
        const timer = setTimeout(close, correct ? 2200 : 4200)
        back.onclick = () => { clearTimeout(timer); close() }
      }, 260)
    }

    const tick = (now: number) => {
      if (done) return
      const left = Math.max(0, seconds - (now - start) / 1000)
      arc.style.strokeDashoffset = String(len * (1 - left / seconds))
      const sec = Math.ceil(left)
      if (sec !== lastSec) { lastSec = sec; num.textContent = String(sec); if (sec <= 3 && sec > 0) sfx.tick() }
      if (left <= 0) { finish("timeout"); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    // Swipe with tilt; the stamp fades in toward the chosen side.
    let sx = 0, dx = 0, dragging = false
    card.addEventListener("pointerdown", (e) => { dragging = true; sx = e.clientX; dx = 0; card.setPointerCapture(e.pointerId); card.style.transition = "none" })
    card.addEventListener("pointermove", (e) => {
      if (!dragging || done) return
      dx = e.clientX - sx
      card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`
      stampF.style.opacity = String(Math.min(1, Math.max(0, -dx / 90)))
      stampR.style.opacity = String(Math.min(1, Math.max(0, dx / 90)))
    })
    const release = () => {
      if (!dragging || done) return
      dragging = false
      if (dx < -90) finish("fake")
      else if (dx > 90) finish("real")
      else {
        card.style.transition = "transform .3s cubic-bezier(.2,1.6,.4,1)"
        card.style.transform = "none"
        stampF.style.opacity = stampR.style.opacity = "0"
      }
    }
    card.addEventListener("pointerup", release)
    card.addEventListener("pointercancel", release)
    ;(actions.querySelector(".fake") as HTMLButtonElement).onclick = () => finish("fake")
    ;(actions.querySelector(".real") as HTMLButtonElement).onclick = () => finish("real")
  })
}
