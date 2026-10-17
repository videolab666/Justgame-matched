# «Не ведись!» — План 2: главы 2–4

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Главы 2 «Маркетплейс», 3 «Родина», 4 «Держпослуги й соцмережі» (по 6 уровней): три новых типа фейков, КЕП, комбо двух спецплиток, ~30 новых сценариев, карта с главами.

**Architecture:** Расширение существующих модулей; логика по-прежнему возвращает данные, рендер их проигрывает. Глобальные ограничения — как в Плане 1.

## Global Constraints
- Всё из Плана 1 (портрет 7×8, украинский UI, детерминированная логика, вымышленные банки/домены в фейках).
- Новые механики появляются по главам: гл. 2 — фейк «оголошення» (2 удара) и спецплитка «Сповіщення» уже знакома; гл. 3 — фейк «дзвінок» и КЕП; гл. 4 — «підробка» и комбо двух спецплиток.

### Task 1: Fake types `ad`, `call`, `forgery`
**Files:** `src/logic/cells.ts`, `src/logic/generate.ts`, `src/logic/resolve.ts`, `src/logic/fakes.ts`, `src/logic/level.ts`, tests `tests/logic/fakes.test.ts`.
**Produces:**
```ts
// cells.ts
export type FakeCell = { t: "fake"; fake: FakeType; hp: number; id: number; disguise?: Kind; revealed?: boolean }
// fakes.ts
export function hopCalls(b: Board, rng: Rng): { board: Board; hops: { from: number; to: number }[] }
// level.ts MoveResult gains: hops?: { from: number; to: number }[]
```
Rules: `ad` has 2 hp (exists). `call` — after every valid move (after spreading) each call fake swaps places with a random 4-neighbour plain tile (none → stays). `forgery` — generated/spread with `disguise` = a tile kind; the first hit only reveals it (`revealed: true`, hp unchanged); later hits damage it; it never matches. Tests: ad survives one hit; call hops to a neighbour and the tile goes to the call's old cell; call without plain neighbours stays; forgery first hit reveals without destroying, second destroys; spreading a forgery makes a disguised forgery.

### Task 2: KEP and special+special combos
**Files:** `src/logic/resolve.ts`, tests in `tests/logic/resolve.test.ts`.
**Produces:** `Rules = { specials: Set<...>; combos?: boolean }`.
Rules (only when `combos`): swapping two specials is valid and fires both as one combo — row/col+row/col → cross (row and column); line+notify → three rows and three columns; notify+notify → 5×5; kep+special (kind k) → every tile of kind k becomes that special and all fire; kep+kep → whole board. Tests for each combo's cleared area; swap of two specials without `combos` stays invalid unless it makes a match.

### Task 3: Content — chapters 2–4 and scams
**Files:** `src/content/levels.ts` (CHAPTER2..4, `LEVELS`, `CHAPTERS: { n, title, levels }[]`), `src/content/scams.ts` (+≈30), tests `tests/content/content.test.ts` extended to all 24 levels and every chapter's categories (each audience ≥ 12 per chapter).

### Task 4: Rendering for new fakes and combos
**Files:** `src/render/tiles/fake-ad.svg`, `fake-ad-cracked.svg`, `fake-call.svg`, `fake-forgery.svg`, `src/render/board-view.ts`, `src/fx/board-fx.ts`, `src/main.ts`.
Texture choice: ad hp2 → `fake-ad`, hp1 → `fake-ad-cracked`; call → `fake-call` (+ ringing wobble); forgery unrevealed → tile texture of `disguise` with a faint glitch, revealed → `fake-forgery`. Call hops and forgery reveal animate through the existing animated `setBoard`; reveal gets a glitch burst. Combos reuse beam/ring/bolt effects; a «Комбо!» pop text.

### Task 5: Chapter map and flow
**Files:** `src/ui/screens.ts`, `src/main.ts`, `src/ui/styles.css`.
Map shows one chapter at a time with ← → and the chapter title; a level opens when the previous level (in global order) has ≥1 star or «Відкрити всі рівні». After a chapter's last level «Далі» goes to the next chapter's first level. Each new mechanic's first level gets Чек's hint explaining it.

### Task 6: Balance and verification
`scripts/bot.ts` iterates `LEVELS`; tune so the random bot wins ≈ 50–75 % and sees ≥ 2 scams per level, greedy ≥ 70 %. Browser check of each new mechanic (screenshots). Commit per task.
