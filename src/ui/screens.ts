import { sfx } from "../audio/sfx"
import type { Audience, Scam } from "../content/types"
import { KIND_NAMES } from "../logic/cells"
import type { LevelDef } from "../logic/level"
import { svgUrl } from "../render/textures"
import type { SaveData } from "../save"
import { gsap } from "gsap"
import { WHEEL, type BoosterKind, type Boosters } from "../logic/bonus"
import { enterScreen, leaveScreen, sparkleBurst } from "./anim"
import { fakeIcon } from "./icons"
import { el, esc, highlight } from "./text"

const chek = () => `<img class="chek" src="${svgUrl("chek")}" alt="Пес Чек">`

/** Mount a full-screen panel and resolve with whatever `wire` reports. */
function screen<T>(root: HTMLElement, html: string, wire: (s: HTMLElement, done: (v: T) => void) => void): Promise<T> {
  return new Promise((resolve) => {
    const s = el("div", "screen", html)
    root.append(s)
    enterScreen(s)
    let closing = false
    wire(s, async (v) => {
      if (closing) return
      closing = true
      sfx.unlock()
      s.style.pointerEvents = "none"
      await leaveScreen(s)
      s.remove()
      resolve(v)
    })
  })
}

export function showStart(root: HTMLElement): Promise<Audience> {
  return screen(root, `
    <h1>Не ведись!</h1>
    ${chek()}
    <div class="say">Привіт, я Чек! Збирай однакові речі, гаси фейки й не ведись на повідомлення шахраїв.</div>
    <h2>Для кого граємо?</h2>
    <div class="aud">
      <button class="big" data-a="self"><span>🙋</span><div>Для мене<small>Банк, OLX, держпослуги</small></div></button>
      <button class="big alt" data-a="parents"><span>👵</span><div>Для батьків<small>Дзвінки «з банку», «родич у біді»</small></div></button>
      <button class="big gold" data-a="kids"><span>🧒</span><div>Для дітей<small>Ігри, скіни, друзі в месенджерах</small></div></button>
    </div>`, (s, done) => {
    s.querySelectorAll<HTMLButtonElement>("[data-a]").forEach((b) => (b.onclick = () => done(b.dataset.a as Audience)))
  })
}

export type MapChoice = { kind: "level"; id: string } | { kind: "settings" } | { kind: "chapter"; ci: number } | { kind: "refresh" } | { kind: "daily" } | { kind: "install" }
export type Chapter = { n: number; title: string; levels: LevelDef[] }

/** One chapter at a time; levels open in global order (previous level has a star). */
export function showMap(root: HTMLElement, save: SaveData, chapters: Chapter[], ci: number, extra: { key: string; install: string }): Promise<MapChoice> {
  const all = chapters.flatMap((c) => c.levels)
  const open = (id: string) => {
    const g = all.findIndex((l) => l.id === id)
    return g >= 0 // every level is open from the start
  }
  const ch = chapters[ci]
  const levels = ch.levels
  const next = levels.findIndex((l) => open(l.id) && !save.stars[l.id])
  const total = all.reduce((a, l) => a + (save.stars[l.id] ?? 0), 0)
  const tiles = levels.map((l, k) => {
    const st = save.stars[l.id] ?? 0
    const ok = open(l.id)
    const cls = !ok ? "locked" : k === next ? "next" : ""
    return `<button class="lvl ${cls}" data-k="${k}" ${ok ? "" : "disabled"}>${ok ? k + 1 : "🔒"}<small>${ok ? "★".repeat(st) + "☆".repeat(3 - st) : ""}</small></button>`
  }).join("")
  const chapterOpen = open(levels[0].id)
  const say = !chapterOpen ? "Цей розділ відкриється, коли пройдеш попередній."
    : next >= 0 ? esc(levels[next].hint) : "Розділ пройдено! Спробуй зібрати всі зірки або йди далі."
  const best = save.daily.key === extra.key ? save.daily.best : 0
  const daily = `<button class="big gold daily" data-daily>📅 Справа дня · 60 секунд
    <small>${best ? `Твій рекорд сьогодні: ${best}` : "Нове поле щодня — однакове для всіх"}${save.streak.count ? ` · 🔥 ${save.streak.count}` : ""}</small></button>`
  const install = extra.install === "prompt" ? `<button class="link" data-install>📲 Встановити гру</button>`
    : extra.install === "ios" ? `<span class="hint-ios">📲 Встановити: «Поділитися» → «На початковий екран»</span>` : ""
  return screen(root, `
    ${daily}
    <div class="chapter-nav"><button class="arrow" data-prev ${ci === 0 ? "disabled" : ""}>‹</button>
      <div><small>Розділ ${ch.n} з ${chapters.length}</small><h2>${esc(ch.title)}</h2></div>
      <button class="arrow" data-next ${ci === chapters.length - 1 ? "disabled" : ""}>›</button></div>
    <p>⭐ ${total} / ${all.length * 3}</p>
    <div class="map">${tiles}</div>
    ${chek()}
    <div class="say">${say}</div>
    <div class="row"><button class="link" data-settings>⚙️ Налаштування</button>${install}</div>`,
  (s, done) => {
    s.querySelectorAll<HTMLButtonElement>(".lvl:not(.locked)").forEach((b) => (b.onclick = () => done({ kind: "level", id: levels[Number(b.dataset.k)].id })))
    s.querySelector<HTMLButtonElement>("[data-settings]")!.onclick = () => done({ kind: "settings" })
    s.querySelector<HTMLButtonElement>("[data-daily]")!.onclick = () => done({ kind: "daily" })
    const ins = s.querySelector<HTMLButtonElement>("[data-install]")
    if (ins) ins.onclick = () => done({ kind: "install" })
    s.querySelector<HTMLButtonElement>("[data-prev]")!.onclick = () => done({ kind: "chapter", ci: ci - 1 })
    s.querySelector<HTMLButtonElement>("[data-next]")!.onclick = () => done({ kind: "chapter", ci: ci + 1 })
  })
}

const BOOSTER_UI: Record<BoosterKind, { icon: string; label: string }> = {
  row: { icon: "fx-row", label: "2FA" }, notify: { icon: "fx-notify", label: "Сповіщення" },
  kep: { icon: "fx-kep", label: "КЕП" }, moves: { icon: "", label: "+3 ходи" },
}

/** Level intro; owned boosters are toggle chips. Resolves with the picks. */
export function showIntro(root: HTMLElement, def: LevelDef, boosters?: Boosters): Promise<BoosterKind[]> {
  const owned = boosters ? (Object.keys(BOOSTER_UI) as BoosterKind[]).filter((k) => boosters[k] > 0) : []
  const chips = owned.map((k) => `<button class="booster" data-b="${k}">
      ${BOOSTER_UI[k].icon ? `<img src="${svgUrl(BOOSTER_UI[k].icon)}" alt="">` : `<b class="plus">+3</b>`}
      <span>${BOOSTER_UI[k].label}</span><i>${boosters![k]}</i></button>`).join("")
  const goals = def.goals.map((g) => {
    const icon = g.type === "fakes" ? fakeIcon(def) : KIND_NAMES[g.kind]
    const label = g.type === "fakes" ? "погасити фейки" : "зібрати"
    return `<div class="goal"><img src="${svgUrl(icon)}" alt=""><span>${g.n}</span></div><small style="color:var(--muted)">${label}</small>`
  }).join("")
  return screen(root, `
    <h2>${def.id === "daily" ? "📅 " + esc(def.title) : esc(def.id) + " · " + esc(def.title)}</h2>
    <div class="row" style="align-items:center">${goals}</div>
    <p>За ${def.moves} ходів</p>
    ${chek()}
    <div class="say">${esc(def.hint)}</div>
    ${chips ? `<div class="boosters"><small>Бустери в бій (натисни, щоб узяти):</small><div class="row">${chips}</div></div>` : ""}
    <button class="big gold" data-go>Грати!</button>`, (s, done) => {
    const picks = new Set<BoosterKind>()
    s.querySelectorAll<HTMLButtonElement>("[data-b]").forEach((b) => (b.onclick = () => {
      const k = b.dataset.b as BoosterKind
      if (picks.has(k)) picks.delete(k); else picks.add(k)
      b.classList.toggle("on", picks.has(k))
    }))
    s.querySelector<HTMLButtonElement>("[data-go]")!.onclick = () => done([...picks])
  })
}

/** Casino fortune wheel: spins to `index` and shows the prize. */
export function showWheel(root: HTMLElement, index: number): Promise<void> {
  const n = WHEEL.length, step = 360 / n
  const colors = ["#ff5c9a", "#7ab8ff", "#ffe14d", "#5ff2b6", "#c77aff", "#ffa95c", "#ff9ad1", "#ffd21f"]
  const conic = WHEEL.map((_, i) => `${colors[i % colors.length]} ${i * step}deg ${(i + 1) * step}deg`).join(",")
  const labels = WHEEL.map((w, i) => `<div class="seg" style="transform:rotate(${i * step + step / 2}deg)"><span>${w.prize === "jackpot" ? "💰 " : w.prize === "moves" ? "➕ " : "✦ "}${esc(w.label)}</span></div>`).join("")
  const bulbs = Array.from({ length: 16 }, (_, i) => `<i style="transform:rotate(${i * 22.5}deg) translateY(-148px);animation-delay:${(i % 2) * 0.4}s"></i>`).join("")
  return screen(root, `
    <h1>Колесо фортуни</h1>
    <p>Перемога! Крути — і виграй бустер на наступний бій.</p>
    <div class="wheel-wrap"><div class="pointer"></div><div class="bulbs">${bulbs}</div>
      <div class="wheel" style="background:conic-gradient(${conic})">${labels}<div class="hub">✦</div></div></div>
    <button class="big gold" data-spin>🎰 Крутити!</button>
    <div class="prize" hidden></div>`, (s, done) => {
    const wheel = s.querySelector<HTMLElement>(".wheel")!
    const btn = s.querySelector<HTMLButtonElement>("[data-spin]")!
    btn.onclick = () => {
      btn.disabled = true
      const target = 360 * 6 + (360 - (index * step + step / 2))
      let last = 0
      gsap.to(wheel, {
        rotation: target, duration: 4.2, ease: "power4.out",
        onUpdate: () => { const seg = Math.floor((gsap.getProperty(wheel, "rotation") as number) / step); if (seg !== last) { last = seg; sfx.tick() } },
        onComplete: () => {
          const w = WHEEL[index]
          sfx.win()
          const prize = s.querySelector<HTMLElement>(".prize")!
          prize.hidden = false
          prize.innerHTML = `<b>${w.prize === "jackpot" ? "💰 ДЖЕКПОТ! Усі бустери!" : "Виграш: " + esc(w.label) + "!"}</b>`
          gsap.fromTo(prize, { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: "elastic.out(1, 0.5)" })
          const r = wheel.getBoundingClientRect()
          sparkleBurst(r.left + r.width / 2, r.top + r.height / 2, 40, 220)
          btn.textContent = "Забрати ✦"
          btn.disabled = false
          btn.onclick = () => done(undefined)
        },
      })
    }
  })
}

export type ResultChoice = "next" | "retry" | "map"
export type ReviewItem = { scam: Scam; answer: string; correct: boolean }

export function showResult(root: HTMLElement, r: { won: boolean; stars: number; score: number; hasNext: boolean; answers: ReviewItem[] }): Promise<ResultChoice> {
  const stars = [1, 2, 3].map((k) => `<span class="${k <= r.stars ? "on" : ""}" style="animation-delay:${0.15 + k * 0.18}s">⭐</span>`).join("")
  const review = r.answers.map((a) => {
    const verdict = a.answer === "skip" ? "⏭ Пропущено" : a.answer === "timeout" ? "⏰ Не встиг" : a.correct ? "✓ Правильно" : "✗ Помилка"
    return `<div class="item"><span class="tag ${a.correct ? "ok" : a.answer === "skip" ? "skip" : "no"}">${verdict} · ${a.scam.isFake ? "ФЕЙК" : "СПРАВЖНЄ"}</span>
      <q>${highlight(a.scam.text, a.scam.flags)}</q><div class="why">${esc(a.scam.explain)}</div></div>`
  }).join("")
  return screen(root, `
    <h1>${r.won ? "Схему зламано!" : "Майже!"}</h1>
    ${r.won ? `<div class="stars-big">${stars}</div>` : chek()}
    <p>${r.won ? `Очки: ${r.score}` : "Фейки цього разу перемогли. Спробуй ще — тепер ти знаєш їхні хитрощі!"}</p>
    <div class="row">${r.won && r.hasNext ? `<button class="big gold" data-c="next">Далі ▶</button>` : ""}<button class="big ${r.won ? "alt" : "gold"}" data-c="retry">↻ Ще раз</button></div>
    <button class="link" data-c="map">До карти</button>
    ${review ? `<h2>Що це було?</h2><div class="review">${review}</div>` : ""}`, (s, done) => {
    s.querySelectorAll<HTMLButtonElement>("[data-c]").forEach((b) => (b.onclick = () => done(b.dataset.c as ResultChoice)))
  })
}

/** Daily result with a share card (share sheet, or copy to clipboard). */
export function showDailyResult(root: HTMLElement, r: { score: number; fakes: number; best: number; record: boolean; streak: number; text: string; answers: ReviewItem[] }): Promise<"retry" | "map"> {
  const review = r.answers.map((a) => {
    const verdict = a.answer === "skip" ? "⏭ Пропущено" : a.answer === "timeout" ? "⏰ Не встиг" : a.correct ? "✓ Правильно" : "✗ Помилка"
    return `<div class="item"><span class="tag ${a.correct ? "ok" : a.answer === "skip" ? "skip" : "no"}">${verdict} · ${a.scam.isFake ? "ФЕЙК" : "СПРАВЖНЄ"}</span>
      <q>${highlight(a.scam.text, a.scam.flags)}</q><div class="why">${esc(a.scam.explain)}</div></div>`
  }).join("")
  return screen(root, `
    <h1>Справа дня</h1>
    <div class="share-card"><div class="big-num">${r.score}</div><small>очок${r.record ? " · новий рекорд!" : ""}</small>
      <div class="row"><span>🛡️ ${r.fakes} фейків</span><span>🔥 серія ${r.streak}</span><span>🏆 ${r.best}</span></div>
      <div class="dots">${r.answers.filter((a) => a.answer !== "skip").map((a) => (a.correct ? "✅" : "❌")).join("")}</div></div>
    <button class="big gold" data-share>📤 Поділитися</button>
    <div class="row"><button class="big alt" data-c="retry">↻ Ще раз</button></div>
    <button class="link" data-c="map">До карти</button>
    ${review ? `<h2>Що це було?</h2><div class="review">${review}</div>` : ""}`, (s, done) => {
    const share = s.querySelector<HTMLButtonElement>("[data-share]")!
    share.onclick = async () => {
      // Share sheet on phones; otherwise (or if it fails) copy the text.
      try {
        if (navigator.share) { await navigator.share({ text: r.text }); return }
      } catch (e) { if ((e as Error).name === "AbortError") return }
      try {
        await navigator.clipboard.writeText(r.text)
        share.textContent = "✓ Скопійовано — встав у чат!"
      } catch { share.textContent = "Не вдалося скопіювати" }
    }
    s.querySelectorAll<HTMLButtonElement>("[data-c]").forEach((b) => (b.onclick = () => done(b.dataset.c as "retry" | "map")))
  })
}

export function showSettings(root: HTMLElement, save: SaveData, inLevel: boolean): Promise<"close" | "map" | "audience"> {
  return screen(root, `
    <h2>Налаштування</h2>
    <label class="toggle">Звук <input type="checkbox" data-s="sound" ${save.settings.sound ? "checked" : ""}></label>
    <label class="toggle">Менше руху <input type="checkbox" data-s="reducedMotion" ${save.settings.reducedMotion ? "checked" : ""}></label>
    <button class="big alt" data-c="audience">Для кого граємо: ${({ self: "для мене", parents: "для батьків", kids: "для дітей" } as const)[save.audience ?? "self"]}</button>
    ${inLevel ? `<button class="big" data-c="map">Вийти на карту</button>` : ""}
    <button class="big gold" data-c="close">Готово</button>`, (s, done) => {
    s.querySelectorAll<HTMLInputElement>("[data-s]").forEach((i) => (i.onchange = () => {
      save.settings[i.dataset.s as "sound" | "reducedMotion"] = i.checked
    }))
    s.querySelectorAll<HTMLButtonElement>("[data-c]").forEach((b) => (b.onclick = () => done(b.dataset.c as "close" | "map" | "audience")))
  })
}
