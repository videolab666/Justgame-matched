# «Не ведись!» — План 3: PWA и «Справа дня»

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Игра ставится на телефон как приложение и работает офлайн; ежедневный 60-секундный челлендж с одинаковым для всех полем, серией дней и карточкой результата для шеринга.

## Global Constraints
- Всё из Планов 1–2. Без внешних сервисов: шеринг через `navigator.share` или буфер обмена, без аналитики.
- Service worker регистрируется только в production-сборке (в dev кэш мешает).

### Task 1: PWA
**Files:** `public/manifest.webmanifest`, `public/sw.js`, `public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `public/favicon.png`, `index.html`, `src/pwa.ts`, `src/main.ts`, `src/ui/screens.ts`.
- Manifest: name «Не ведись!», `display: standalone`, `orientation: portrait`, theme `#1a1240`, background `#140f33`, icons 192/512 (512 also `maskable`).
- `sw.js`: on install cache `./` and `./index.html`; fetch — navigation network-first with cache fallback; same-origin GET and Google Fonts — stale-while-revalidate into a versioned cache; old caches removed on activate.
- `src/pwa.ts`: `registerSW()` (prod only), `installState()` → `"installed" | "prompt" | "ios" | "none"`, `promptInstall()`.
- Map shows «📲 Встановити гру» when `prompt`; on iOS a hint «Поділитися → На початковий екран».
- Icons rendered from `chek.svg` on the game background.

### Task 2: Daily challenge logic
**Files:** `src/content/daily.ts`, `src/save.ts`, `src/logic/level.ts`, tests `tests/content/daily.test.ts`.
**Produces:**
```ts
export const DAILY_SECONDS = 60
export function dailyKey(d: Date): string                 // "2026-10-18" (local date)
export function dailyLevel(key: string): { def: LevelDef; seed: number }  // same key → same def+seed
export function updateStreak(s: { last: string | null; count: number }, key: string): { last: string; count: number }
export function shareText(r: { key: string; score: number; fakes: number; answers: boolean[]; streak: number; url: string }): string
```
`LevelDef` gains `timeLimit?: number`. Daily def: all specials + combos, fakes mixed from all four types, goals `fakes n: 999` (never "won" early), moves 999, `interruptEvery: 5`, categories — all. Save gains `daily: { key: string; best: number }` and `streak: { last: string | null; count: number }`. Streak: same day → unchanged; next day → +1; gap → 1.

### Task 3: Daily mode UI
**Files:** `src/ui/hud.ts` (timer instead of moves when `timeLimit`), `src/ui/screens.ts` (`showDailyResult`), `src/main.ts`.
- Map: big «📅 Справа дня · 60 секунд» button with today's best and streak.
- Timer runs on the game ticker, pauses during the scam card and settings; last 10 s pulse; on 0 the board locks after the current animation and the result shows.
- Scam answers: correct «Фейк» → police, correct «Справжнє» → «+5 секунд», wrong → +2 fakes.
- Result: score, fakes extinguished, answers ✅/❌, best today, streak 🔥, «Поділитися» (share sheet or copy, button text confirms), «Ще раз», «До карти»; «Що це було?» review as in levels.

### Task 4: Verify
Tests green; production build; preview (`vite preview`) with SW: manifest valid, SW active, reload offline works; daily flow in the phone viewport; commit per task.
