# «Не ведись!» — План 4: «казино» — мультивзрывы и бонусы

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** яркие бонусы в духе казино: бонус-финал из оставшихся ходов, множитель комбо, «Мультивибух», «Джекпот» с дождём монет, колесо фортуны после победы и бустеры перед боем.

## Global Constraints
- Всё из Планов 1–3. Никаких реальных денег, ставок и покупок — «казино» только визуально; бустеры выигрываются игрой.
- «Менше руху» упрощает эффекты (без slow-mo, тряски и дождя монет).

### Task 1: Logic (tests first)
**Files:** `src/logic/bonus.ts`, `src/save.ts`, tests `tests/logic/bonus.test.ts`.
```ts
export type BoosterKind = "row" | "notify" | "kep" | "moves"
export type Boosters = Record<BoosterKind, number>
export const WHEEL: { prize: BoosterKind | "jackpot"; label: string; weight: number }[]
export function spinWheel(rng: Rng): number                     // index into WHEEL
export function finaleRounds(s: LevelState, max = 12): { state: LevelState; rounds: { at: number; special: Special; steps: Step[]; bonus: number }[] }
export function applyBoosters(s: LevelState, picks: BoosterKind[], seed: number): { state: LevelState; placed: number[] }
```
Finale: for each remaining move (≤ 12): a random plain tile becomes row/col (alternating), fires and cascades; +60 per move plus the blast score; moves end at 0. Boosters: row/notify/kep put that special on a random plain tile; moves adds 3. Save gains `boosters: Boosters` (defaults 1 of each to start).

### Task 2: Juice
**Files:** `src/fx/board-fx.ts`, `src/fx/particles.ts`, `src/render/tiles/coin.svg`, `src/render/board-view.ts`, `src/ui/combo.ts`, `src/ui/styles.css`.
- Score popups «+N» per step; combo meter «x2…x8» (slot-roll DOM badge), resets after the move.
- ≥ 2 specials fired in one step → «МУЛЬТИВИБУХ!», rings on every blast, flash, coin burst.
- cascade ≥ 5 or a KEP/combo swap → «ДЖЕКПОТ!» rainbow banner + coin rain over the whole screen + slow-mo.

### Task 3: Bonus finale, fortune wheel, boosters UI
**Files:** `src/main.ts`, `src/ui/screens.ts` (`showWheel`, intro booster chips), `src/ui/styles.css`.
- Win → «БОНУС-ФІНАЛ!» banner → each remaining move: a sparkle rocket flies from the moves badge to the tile, the tile turns special and fires; score counts up.
- After the finale: fortune wheel (8 segments, casino bulbs, spin with ease-out, prize popup with sparkles) → prize goes to the save.
- Level intro shows owned boosters as toggle chips; chosen ones are spent and applied after the drop-in.

### Task 4: Verify and deploy
Tests, build, browser check of finale/wheel/boosters, push (GitHub Pages deploys on push once Pages is enabled with source «GitHub Actions»).
