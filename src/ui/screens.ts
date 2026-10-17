import { sfx } from "../audio/sfx"
import type { Audience, Scam } from "../content/types"
import { KIND_NAMES } from "../logic/cells"
import type { LevelDef } from "../logic/level"
import { svgUrl } from "../render/textures"
import type { SaveData } from "../save"
import { el, esc, highlight } from "./text"

const chek = () => `<img class="chek" src="${svgUrl("chek")}" alt="Пес Чек">`

/** Mount a full-screen panel and resolve with whatever `wire` reports. */
function screen<T>(root: HTMLElement, html: string, wire: (s: HTMLElement, done: (v: T) => void) => void): Promise<T> {
  return new Promise((resolve) => {
    const s = el("div", "screen", html)
    root.append(s)
    wire(s, (v) => { sfx.unlock(); s.remove(); resolve(v) })
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

export type MapChoice = { kind: "level"; id: string } | { kind: "settings" }

export function showMap(root: HTMLElement, save: SaveData, levels: LevelDef[]): Promise<MapChoice> {
  const open = (k: number) => save.allOpen || k === 0 || (save.stars[levels[k - 1].id] ?? 0) > 0
  const next = levels.findIndex((l, k) => open(k) && !save.stars[l.id])
  const total = levels.reduce((a, l) => a + (save.stars[l.id] ?? 0), 0)
  const tiles = levels.map((l, k) => {
    const st = save.stars[l.id] ?? 0
    const cls = !open(k) ? "locked" : k === next ? "next" : ""
    return `<button class="lvl ${cls}" data-k="${k}" ${open(k) ? "" : "disabled"}>${open(k) ? k + 1 : "🔒"}<small>${open(k) ? "★".repeat(st) + "☆".repeat(3 - st) : ""}</small></button>`
  }).join("")
  return screen(root, `
    <h2>Розділ 1 · Банк</h2>
    <p>⭐ ${total} / ${levels.length * 3}</p>
    <div class="map">${tiles}</div>
    ${chek()}
    <div class="say">${next >= 0 ? esc(levels[next].hint) : "Розділ пройдено! Спробуй зібрати всі зірки."}</div>
    <div class="row">${save.allOpen ? "" : `<button class="link" data-open>Відкрити всі рівні</button>`}<button class="link" data-settings>⚙️ Налаштування</button></div>`,
  (s, done) => {
    s.querySelectorAll<HTMLButtonElement>(".lvl:not(.locked)").forEach((b) => (b.onclick = () => done({ kind: "level", id: levels[Number(b.dataset.k)].id })))
    const o = s.querySelector<HTMLButtonElement>("[data-open]")
    if (o) o.onclick = () => { save.allOpen = true; done({ kind: "settings" }) }
    s.querySelector<HTMLButtonElement>("[data-settings]")!.onclick = () => done({ kind: "settings" })
  })
}

export function showIntro(root: HTMLElement, def: LevelDef): Promise<void> {
  const goals = def.goals.map((g) => {
    const icon = g.type === "fakes" ? "fake-sms" : KIND_NAMES[g.kind]
    const label = g.type === "fakes" ? "погасити фейки" : "зібрати"
    return `<div class="goal"><img src="${svgUrl(icon)}" alt=""><span>${g.n}</span></div><small style="color:var(--muted)">${label}</small>`
  }).join("")
  return screen(root, `
    <h2>${esc(def.id)} · ${esc(def.title)}</h2>
    <div class="row" style="align-items:center">${goals}</div>
    <p>За ${def.moves} ходів</p>
    ${chek()}
    <div class="say">${esc(def.hint)}</div>
    <button class="big gold" data-go>Грати!</button>`, (s, done) => {
    s.querySelector<HTMLButtonElement>("[data-go]")!.onclick = () => done(undefined)
  })
}

export type ResultChoice = "next" | "retry" | "map"
export type ReviewItem = { scam: Scam; answer: string; correct: boolean }

export function showResult(root: HTMLElement, r: { won: boolean; stars: number; score: number; hasNext: boolean; answers: ReviewItem[] }): Promise<ResultChoice> {
  const stars = [1, 2, 3].map((k) => `<span class="${k <= r.stars ? "on" : ""}" style="animation-delay:${0.15 + k * 0.18}s">⭐</span>`).join("")
  const review = r.answers.map((a) => {
    const verdict = a.answer === "timeout" ? "⏰ Не встиг" : a.correct ? "✓ Правильно" : "✗ Помилка"
    return `<div class="item"><span class="tag ${a.correct ? "ok" : "no"}">${verdict} · ${a.scam.isFake ? "ФЕЙК" : "СПРАВЖНЄ"}</span>
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
