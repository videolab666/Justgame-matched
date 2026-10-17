# «Не ведись!» — План 1: играбельный срез (глава «Банк»)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Играбельная в браузере на телефоне глава 1 (6 уровней): три-в-ряд с 2FA и Сповіщенням, фейки SMS с распространением, вторжения мошенника со свайпом, разбор «Що це було», сочные анимации и звук.

**Architecture:** Чистая детерминированная логика (`src/logic`) возвращает список шагов (`Step[]`); рендер на PixiJS v8 (`src/render`, `src/fx`) проигрывает шаги GSAP-таймлайном; текстовый UI — DOM-слой (`src/ui`). Контент — JSON (`src/content`). Сохранение — `localStorage`.

**Tech Stack:** Vite 5, TypeScript 5, Vitest, PixiJS 8, GSAP 3, pixi-filters 6; звук — WebAudio-синтез (без внешних файлов).

## Global Constraints

- Портретная ориентация, целевой экран 390×844; поле 7 столбцов × 8 строк.
- Интерфейс только на украинском; код и комментарии на английском.
- Без внешних ассетов кроме npm-пакетов и шрифта Unbounded из Google Fonts; плитки, фейки и персонаж — свои SVG.
- Логика детерминирована по сиду (mulberry32); никакого `Math.random` в `src/logic`.
- В фейках — только вымышленные банки и домены; реальные госсервисы (Дія, 1545, Кіберполіція) упоминаются корректно.
- 60 fps цель; «Менше руху» отключает тряску, slow-mo и тяжёлые фильтры.
- Outmatched (Rune, MIT): алгоритмы совпадений, гравитации, проверки хода и перемешивания портируются с указанием в `NOTICE`.

## File Structure

```
NeVedys/
  package.json, tsconfig.json, vite.config.ts, index.html, NOTICE, .gitignore
  src/
    main.ts                 — bootstrap: save, screens, game loop wiring
    logic/
      rng.ts                — mulberry32 seeded RNG
      grid.ts               — index/coords helpers for a W×H board
      cells.ts              — Cell types and constructors
      match.ts              — findMatches(): groups with shape
      resolve.ts            — swap validation + cascade resolution → Step[]
      fakes.ts              — fake hits and spreading
      generate.ts           — initial board, hasValidMove, shuffle
      level.ts              — LevelDef/LevelState, applyMove, boosters, goals, stars
    content/
      levels.ts             — chapter 1 level definitions (typed TS, not JSON: type-checked)
      scams.ts              — scam scenarios (typed TS)
      deck.ts               — no-repeat scam picker
    render/
      textures.ts           — SVG → textures
      board-view.ts         — sprites, layout, input, step playback
      tiles/*.svg           — 6 tiles, fake-sms, 2fa, notify overlays
    fx/
      particles.ts          — burst emitter on ParticleContainer
      juice.ts              — shake, slow-mo, combo text, flash
      quality.ts            — reduced motion + auto quality
    audio/sfx.ts            — WebAudio synth: pop, chime, combo pitch, whoosh, error
    ui/
      styles.css
      hud.ts                — moves, goals, score bar, stars
      scam-card.ts          — interrupt card: swipe, timer, buttons, verdict
      screens.ts            — start (audience), map, result + «Що це було», settings
    save.ts
  tests/  logic/*.test.ts, content/*.test.ts
```

Notes on decisions:
- Content in TS instead of JSON (spec says JSON): same data, but type-checked at build; the spec's field names are kept. Recorded here as a deliberate deviation.
- Fakes fall with gravity like tiles (they are "infected items"); they never match.
- Content types (`Audience`, `ScamCategory`, `Channel`, `Scam`) live in `src/content/types.ts`; `logic/level.ts` imports them type-only.

---

### Task 1: Project scaffold

**Files:** Create `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `NOTICE`, `.gitignore`, `tests/smoke.test.ts`.

- [ ] Step 1: `package.json` scripts `dev` (vite), `build` (`tsc --noEmit && vite build`), `test` (`vitest run`); deps `pixi.js@^8`, `gsap@^3`, `pixi-filters@^6`; devDeps `vite@^5`, `typescript@^5`, `vitest@^2`.
- [ ] Step 2: `vite.config.ts` with `base: "./"`; `tsconfig.json` strict, `moduleResolution: "bundler"`, `target: "ES2022"`, `lib: ["ES2022","DOM"]`.
- [ ] Step 3: `index.html` (lang="uk", viewport `width=device-width,initial-scale=1,viewport-fit=cover`, Unbounded font link, `<div id="app">`), `src/main.ts` renders "Не ведись!" text.
- [ ] Step 4: `tests/smoke.test.ts`: `expect(1+1).toBe(2)`.
- [ ] Step 5: `npm install`, `npm test` → PASS, `npm run build` → `dist/` created.
- [ ] Step 6: `NOTICE` with Rune Outmatched MIT text (Copyright (c) 2024 Rune AI Inc.) and statement which files are derived. Commit `chore: scaffold Vite + TS + Pixi project`.

### Task 2: RNG, grid, cells

**Files:** `src/logic/rng.ts`, `src/logic/grid.ts`, `src/logic/cells.ts`, `tests/logic/grid.test.ts`.

**Produces:**
```ts
// rng.ts
export type Rng = { next(): number; int(n: number): number; state(): number }
export function makeRng(seed: number): Rng
// grid.ts
export type Grid = { w: number; h: number }
export const idx = (g: Grid, r: number, c: number) => r * g.w + c
export const rc = (g: Grid, i: number) => ({ r: Math.floor(i / g.w), c: i % g.w })
export function inBounds(g: Grid, r: number, c: number): boolean
export function neighbors4(g: Grid, i: number): number[]
export function areNeighbors(g: Grid, a: number, b: number): boolean
// cells.ts
export type Kind = 0 | 1 | 2 | 3 | 4 | 5   // passport, stamp, key, phone, card, envelope
export type Special = "row" | "col" | "notify" | "kep" | "police"
export type FakeType = "sms" | "ad" | "call" | "forgery"
export type Cell =
  | { t: "tile"; kind: Kind; special?: Special; id: number }
  | { t: "fake"; fake: FakeType; hp: number; id: number }
export const KINDS = 6
```
`id` is a stable sprite id assigned by the board's id counter.

- [ ] Step 1: tests: `makeRng(1)` repeats the same sequence for the same seed and differs for seed 2; `int(6)` always in 0..5 over 1000 draws; `neighbors4` of a corner has 2 entries, of an edge 3, of an inner cell 4; `areNeighbors` false across row wrap (index 6 and 7 on w=7).
- [ ] Step 2: run → FAIL; implement (mulberry32); run → PASS; commit `feat(logic): seeded rng and grid helpers`.

### Task 3: Match finding with shapes

**Files:** `src/logic/match.ts`, `tests/logic/match.test.ts`.

**Produces:**
```ts
export type MatchShape = "line3" | "line4h" | "line4v" | "line5" | "lt"
export type MatchGroup = { cells: number[]; kind: Kind; shape: MatchShape }
export function findMatches(g: Grid, cells: (Cell | null)[]): MatchGroup[]
```
Rules: horizontal and vertical runs ≥3 of same `kind` among `t:"tile"` cells; runs sharing a cell merge into one group (Outmatched cluster merge); shape: merged horizontal+vertical → `lt`; single run of 5+ → `line5`; 4 → `line4h`/`line4v` by orientation; else `line3`. Fakes and nulls break runs.

- [ ] Step 1: tests with a helper `board(rows: string[])` where digits are kinds, `x` a fake: three in a row → one `line3`; four horizontal → `line4h`; four vertical → `line4v`; five → `line5`; L of 3+3 sharing corner → `lt` with 5 cells; fake in the middle of `00x00` → no match; two separate triples → two groups.
- [ ] Step 2: FAIL → implement → PASS → commit `feat(logic): match groups with shapes`.

### Task 4: Swap, cascade, specials

**Files:** `src/logic/resolve.ts`, `src/logic/fakes.ts`, `tests/logic/resolve.test.ts`.

**Produces:**
```ts
export type Rules = { specials: Set<"row" | "col" | "notify" | "kep"> }
export type Step = {
  matched: MatchGroup[]
  cleared: number[]                                  // tile cells removed this step
  created: { index: number; special: Special; kind: Kind; id: number }[]
  fired: { index: number; special: Special; area: number[] }[]
  fakesHit: { index: number; destroyed: boolean }[]
  moved: Record<number, number>                      // to ← from
  added: Record<number, Cell>                        // index → new cell (spawned above)
}
export type Board = { g: Grid; cells: Cell[]; nextId: number }
export function isValidSwap(b: Board, a: number, c: number): boolean
export function resolveSwap(b: Board, a: number, c: number, rng: Rng, rules: Rules): { board: Board; steps: Step[] }
export function fireSpecialAt(b: Board, i: number, rng: Rng, rules: Rules): { board: Board; steps: Step[] } // used by boosters
```
Behaviour:
- Swap valid if neighbours and the swap produces a match, or either cell is `kep` (KEP swapped with a tile clears all tiles of that tile's kind).
- Each cascade step: find matches → for groups with `line4h` create `row` (if allowed), `line4v` → `col`, `lt` → `notify`, `line5` → `kep`; placement: the swapped cell if in the group on the first step, otherwise the group's middle cell; disallowed specials just clear.
- Specials inside cleared cells fire (chain): `row` clears its row, `col` its column, `notify` 3×3, `kep` all tiles of its kind, `police` all fakes of the most common fake type.
- Fake hit: every fake 4-adjacent to a cleared tile, or inside a fired area, takes 1 hit (once per step); `hp` 0 → removed (`destroyed: true`).
- Gravity: column-wise, cells (tiles and fakes) fall into nulls (Outmatched `removeIndices` logic, column-based), new tiles spawn with `rng`.
- Loop until no matches.

- [ ] Step 1: tests (board helper from Task 3, fixed seed): swap creating `000` clears 3 cells and refills, board stays full; invalid swap (no match) → `isValidSwap` false; four in a row with `row` allowed creates a `row` special at the swapped cell; firing `row` clears 7 cells; `notify` clears 3×3 at corner clipped to bounds; fake next to a match loses hp and is destroyed at hp 1; a fake inside a row blast is hit; cascade count > 1 for a prepared board where the refill is forced (seed chosen in test by searching seeds 1..200 for a cascade and asserting the property, not a magic seed); disallowed special (`specials` empty) → 4 cells just cleared.
- [ ] Step 2: FAIL → implement → PASS → commit `feat(logic): swap resolution, cascades, specials, fake hits`.

### Task 5: Board generation, valid moves, shuffle, spreading

**Files:** `src/logic/generate.ts`, extend `src/logic/fakes.ts`, `tests/logic/generate.test.ts`.

**Produces:**
```ts
export function generateBoard(g: Grid, rng: Rng, fakes: { index: number; fake: FakeType; hp: number }[]): Board // no initial matches, ≥1 valid move
export function hasValidMove(b: Board): boolean
export function shuffleBoard(b: Board, rng: Rng): { board: Board; moved: Record<number, number> } // tiles only, fakes stay
export function spreadFake(b: Board, rng: Rng): { board: Board; infected?: { from: number; to: number } }
```
- [ ] Step 1: tests: 50 seeds → generated board has no matches and has a valid move; fakes placed at the requested indices; `shuffleBoard` keeps the multiset of kinds and fake positions, result has no matches and a valid move; `spreadFake` turns exactly one tile adjacent to a fake into a fake of the same type with hp of that type (sms 1), returns nothing when no fake has a tile neighbour.
- [ ] Step 2: FAIL → implement → PASS → commit `feat(logic): generation, valid-move check, shuffle, fake spreading`.

### Task 6: Level state, goals, boosters, stars

**Files:** `src/logic/level.ts`, `tests/logic/level.test.ts`.

**Produces:**
```ts
export type Goal = { type: "fakes"; n: number } | { type: "collect"; kind: Kind; n: number }
export type LevelDef = {
  id: string; chapter: 1 | 2 | 3 | 4; title: string; moves: number; goals: Goal[]
  initialFakes: { index: number; fake: FakeType; hp: number }[]; spreadEvery: number
  interruptEvery: number; categories: ScamCategory[]; stars: [number, number, number]
  specials: ("row" | "col" | "notify" | "kep")[]; hint: string
}
export type LevelState = {
  def: LevelDef; board: Board; rngState: number; movesLeft: number; moveCount: number
  score: number; progress: number[]; fakesDestroyedThisMove: number; status: "playing" | "won" | "lost"
}
export function startLevel(def: LevelDef, seed: number): LevelState
export function applyMove(s: LevelState, a: number, b: number): { state: LevelState; steps: Step[]; infected?: { from: number; to: number }; shuffled?: Record<number, number>; interruptDue: boolean }
export function applyPolice(s: LevelState, index: number): { state: LevelState; steps: Step[] } // places & fires police
export function addFakes(s: LevelState, n: number): { state: LevelState; infected: number[] }
export function addMoves(s: LevelState, n: number): LevelState
export function starsFor(def: LevelDef, score: number, won: boolean): 0 | 1 | 2 | 3
export function scoreSteps(steps: Step[]): number   // Σ group size² × (1 + cascade index × 0.5) + 3 per blast cell + 20 per destroyed fake
```
Rules: invalid move → state unchanged, `steps` empty; valid → moves −1, moveCount +1; progress for `fakes` counts destroyed fakes, for `collect` cleared tiles of kind; spread when `moveCount % spreadEvery === 0` and no fake destroyed in this move and fakes exist; win when all goals reached (checked after spread) → status `won`; moves 0 and not won → `lost`; if no valid move after resolution → shuffle; `interruptDue` when `moveCount % interruptEvery === 0` and status playing.

- [ ] Step 1: tests: invalid move keeps `movesLeft`; valid move decrements; destroying fakes advances `fakes` goal and wins when n reached; spread happens only when no fake destroyed; `interruptDue` true on move 7 for `interruptEvery: 7`; `addMoves(+2)`; `addFakes(2)` adds 2 fakes; `applyPolice` destroys all sms fakes; `starsFor` thresholds; `lost` when moves run out.
- [ ] Step 2: FAIL → implement → PASS → commit `feat(logic): level state, goals, boosters, stars`.

### Task 7: Content — chapter 1 levels, scams, deck

**Files:** `src/content/levels.ts`, `src/content/scams.ts`, `src/content/deck.ts`, `tests/content/content.test.ts`.

**Produces:**
```ts
export type Audience = "self" | "parents" | "kids"
export type ScamCategory = "bank" | "marketplace" | "family" | "gov" | "social" | "work_invest" | "games"
export type Channel = "sms" | "viber" | "telegram" | "call" | "olx" | "diia" | "instagram" | "game"
export type Scam = { id: string; category: ScamCategory; audience: Audience[]; channel: Channel; sender: string; text: string; isFake: boolean; flags: string[]; explain: string }
export const SCAMS: Scam[]
export const CHAPTER1: LevelDef[]
export function pickScam(seen: string[], audience: Audience, categories: ScamCategory[], rng: Rng): { scam: Scam; seen: string[] }
```
Chapter 1 «Банк» (6 levels, specials: level 1–2 none, 3+ `row`/`col`, 5+ `notify`): moves 22→18, goals from `fakes 4` up to `fakes 12` + `collect` card; categories mostly `bank`, also `family`, `gov` from level 4. Scams: 30 entries (bank 10, family 6, gov 5, marketplace 5, games 4), ≈60 % fake, each audience ≥ 12 matching; texts in Ukrainian; flags are substrings of `text` for fakes; real ones have `flags: []`.

- [ ] Step 1: tests: every level `moves>0`, goals non-empty, initialFakes indices < 56 and unique, stars ascending; every scam: fake ⇒ ≥1 flag and every flag is a substring of text; real ⇒ no flags; ids unique; each audience has ≥ 12 scams within chapter-1 categories; `pickScam` never repeats until the pool is exhausted, then reshuffles; no forbidden real bank names in fake texts (`ПриватБанк`, `Монобанк`, `monobank`, `privatbank.ua`, `Ощадбанк`).
- [ ] Step 2: FAIL → write content → PASS → commit `feat(content): chapter 1 levels and 30 scam scenarios`.

### Task 8: Textures and board rendering with input

**Files:** `src/render/tiles/*.svg` (passport, stamp, key, phone, card, envelope, fake-sms, fx-row, fx-col, fx-notify, fx-police), `src/render/textures.ts`, `src/render/board-view.ts`, `src/main.ts`.

**Produces:**
```ts
export async function loadTextures(resolution: number): Promise<Record<string, Texture>>
export class BoardView extends Container {
  constructor(tex: Record<string, Texture>, grid: Grid, cellSize: number)
  setBoard(b: Board): void                          // immediate, no animation
  onSwap: (a: number, b: number) => void            // set by main
  play(steps: Step[], extra?: { infected?: {from:number;to:number}; shuffled?: Record<number,number> }): Promise<void>
  shakeInvalid(a: number, b: number): Promise<void>
  layout(width: number, height: number): void
  locked: boolean
}
```
Input: pointerdown on a tile + drag ≥ 0.35 cell toward a neighbour → swap; or tap tile, tap neighbour. Selected tile pulses. Playback per step: matched tiles pop (scale 1→1.25→0, 0.18 s) with particles; created specials morph; fired specials draw beam/ring; fakes hit flash; moved tiles fall with `bounce.out`, spawned ones from above the board; durations scale with cascade index (faster later).

- [ ] Step 1: draw SVGs (128×128 viewBox, glossy gradient style, distinct silhouettes); `loadTextures` uses `Assets.load` with `data:` URLs from `import.meta.glob('./tiles/*.svg', { as: 'raw', eager: true })`.
- [ ] Step 2: BoardView: mask to board rect, background slots, sprites keyed by cell `id`.
- [ ] Step 3: `main.ts`: Pixi `Application` (`resizeTo: window`, `antialias: true`, `resolution: devicePixelRatio`), start level 1, wire `onSwap` → `applyMove` → `play`.
- [ ] Step 4: verify in browser (Playwright, 390×844): board renders, a swap animates and refills; `npm run build` passes. Commit `feat(render): textured board, swipe input, step playback`.

### Task 9: Juice — particles, shake, combo text, fake glitch, sound

**Files:** `src/fx/particles.ts`, `src/fx/juice.ts`, `src/fx/quality.ts`, `src/audio/sfx.ts`; modify `board-view.ts`.

**Produces:**
```ts
export class Bursts { constructor(parent: Container, tex: Texture); burst(x: number, y: number, color: number, n: number): void; update(dt: number): void }
export function shake(target: Container, strength: number): void
export function comboText(layer: Container, text: string, x: number, y: number): void
export function slowMo(seconds: number): void            // gsap.globalTimeline.timeScale tween
export const quality: { reducedMotion: boolean; heavy: boolean; sample(fps: number): void }
export const sfx: { unlock(): void; pop(cascade: number): void; special(): void; fake(): void; error(): void; win(): void; whoosh(): void; setEnabled(v: boolean): void }
```
- Particles: Pixi v8 `ParticleContainer` + `Particle`, gravity and fade, ≤ 600 alive (≤ 200 when `!heavy`).
- Fakes: `RGBSplitFilter` + small jitter loop; Сповіщення: `ShockwaveFilter` on the board container; combo texts «Супер!» (2), «Схему зламано!» (3), «Мега-комбо!» (≥4); shake from 4+ cleared in a step or any special; slow-mo 0.35 s on ≥4 cascades or KEP.
- Sound: WebAudio — pop: short sine+noise with pitch `440·1.12^cascade`; special: rising sweep; fake: low buzz; win: arpeggio.
- [ ] Steps: implement; verify in browser visually (screenshots before/after a cascade) and FPS ≥ 55 on desktop, ≥ 45 with CPU throttle ×4 (Playwright CDP `Emulation.setCPUThrottlingRate`); commit `feat(fx): particles, shake, combo text, glitch, synth sfx`.

### Task 10: HUD and scam interrupt card

**Files:** `src/ui/styles.css`, `src/ui/hud.ts`, `src/ui/scam-card.ts`; modify `main.ts`.

**Produces:**
```ts
export function mountHud(root: HTMLElement): { update(s: LevelState): void }
export function showScam(root: HTMLElement, scam: Scam, seconds: number): Promise<{ answer: "fake" | "real" | "timeout"; correct: boolean }>
```
Card: messenger bubble (avatar letter, sender, channel badge, text), timer ring 6 s, drag left/right with rotation and «ФЕЙК»/«СПРАВЖНЄ» stamps fading in, buttons below; on answer — flies off, green/red flash, wrong → flags highlighted 1.5 s. While shown, `BoardView.locked = true`.
Wiring: `interruptDue` → `pickScam` → `showScam` → correct fake ⇒ `applyPolice` at a random tile (play steps); correct real ⇒ `addMoves(2)` with «+2 ходи» text; wrong/timeout ⇒ `addFakes(2)` with infection animation. Answers stored for the review.
- [ ] Steps: implement; browser check: card appears on move 7, swipe works with mouse drag, each outcome visible; commit `feat(ui): HUD and scam interrupt card`.

### Task 11: Screens, save, chapter map, review

**Files:** `src/ui/screens.ts`, `src/save.ts`; modify `main.ts`, `styles.css`.

**Produces:**
```ts
export type SaveData = { v: 1; audience: Audience | null; stars: Record<string, number>; seen: string[]; settings: { sound: boolean; reducedMotion: boolean } }
export function loadSave(): SaveData
export function writeSave(s: SaveData): void
export function showStart(root: HTMLElement): Promise<Audience>                 // «Для кого граємо?» Я / Батьки / Діти
export function showMap(root: HTMLElement, save: SaveData): Promise<string>    // returns level id
export function showResult(root: HTMLElement, r: { won: boolean; stars: number; score: number; answers: { scam: Scam; answer: string; correct: boolean }[] }): Promise<"next" | "retry" | "map">
```
Review «Що це було»: each message with verdict, flags highlighted (`<mark>`), explanation. Map: 6 level bubbles on a path, stars, locked/unlocked, «Відкрити всі рівні», settings (звук, Менше руху, змінити «Для кого граємо?»). Pre-level: Чек's hint line from `LevelDef.hint`.
- [ ] Steps: implement; tests for `loadSave` with broken JSON → defaults; browser walkthrough: start → audience → map → level 1 → win (debug: temporarily give 1 move to lose) → result → review → next; commit `feat(ui): start, map, result review, save`.

### Task 12: Phone verification and polish pass

- [ ] Playwright at 390×844 (isMobile, hasTouch): full flow with touch swipe; no horizontal scroll; text legible; FPS with CPU throttle ×4 ≥ 45; fix found issues.
- [ ] Balance check: a greedy bot (picks the valid swap with the largest immediate clear; answers scams 70 % correct) wins each chapter-1 level in ≥ 60 % of 30 seeds — add `scripts/bot.ts` run by `npx vite-node scripts/bot.ts`; adjust `moves`/goals.
- [ ] `README.md` (how to run, structure, licenses); commit `chore: phone verification, balance pass, readme`.
