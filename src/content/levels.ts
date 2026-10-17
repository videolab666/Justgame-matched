import type { LevelDef } from "../logic/level"

// Chapter 1 «Банк». Board is 7×8, index = row * 7 + col. Fakes start apart
// (one match must not clear a whole cluster), and every level pairs the fake
// goal with a collect goal so it runs long enough for 2–3 scam messages.
const at = (r: number, c: number) => r * 7 + c
const sms = (r: number, c: number) => ({ index: at(r, c), fake: "sms" as const, hp: 1 })

export const CHAPTER1: LevelDef[] = [
  { id: "1-1", chapter: 1, title: "Перше SMS", moves: 16, goals: [{ type: "fakes", n: 4 }, { type: "collect", kind: 1, n: 14 }],
    initialFakes: [sms(2, 1), sms(3, 5), sms(5, 2), sms(6, 5)], spreadEvery: 3, interruptEvery: 5,
    categories: ["bank", "games"], stars: [0, 380, 520], specials: [],
    hint: "Фейки ховаються серед звичайних речей. Збери три однакові поруч — і фейк зникне!" },
  { id: "1-2", chapter: 1, title: "Дзвінок «з банку»", moves: 20, goals: [{ type: "fakes", n: 6 }, { type: "collect", kind: 4, n: 15 }],
    initialFakes: [sms(1, 3), sms(3, 0), sms(3, 6), sms(5, 3), sms(6, 0), sms(6, 6)], spreadEvery: 3, interruptEvery: 6,
    categories: ["bank", "games"], stars: [0, 520, 700], specials: [],
    hint: "Банк ніколи не просить CVV чи код із SMS. Почуєш таке — це фейк!" },
  { id: "1-3", chapter: 1, title: "Код із SMS", moves: 21, goals: [{ type: "fakes", n: 8 }, { type: "collect", kind: 3, n: 16 }],
    initialFakes: [sms(1, 1), sms(1, 5), sms(3, 3), sms(4, 0), sms(4, 6), sms(6, 2), sms(6, 4)], spreadEvery: 2, interruptEvery: 6,
    categories: ["bank", "games"], stars: [0, 560, 780], specials: ["row", "col"],
    hint: "Склади чотири в ряд — отримаєш 2FA: він вичищає весь ряд або стовпчик!" },
  { id: "1-4", chapter: 1, title: "Мамо, я в біді", moves: 22, goals: [{ type: "fakes", n: 10 }, { type: "collect", kind: 5, n: 16 }],
    initialFakes: [sms(1, 2), sms(1, 5), sms(3, 0), sms(3, 4), sms(5, 1), sms(5, 6), sms(7, 3), sms(7, 0)], spreadEvery: 2, interruptEvery: 6,
    categories: ["bank", "family", "games"], stars: [0, 650, 880], specials: ["row", "col"],
    hint: "Шахраї тиснуть на емоції: «терміново», «нікому не кажи». Зупинись і перевір!" },
  { id: "1-5", chapter: 1, title: "Виплата від держави", moves: 24, goals: [{ type: "fakes", n: 12 }, { type: "collect", kind: 0, n: 18 }],
    initialFakes: [sms(0, 3), sms(2, 0), sms(2, 6), sms(4, 2), sms(4, 5), sms(6, 0), sms(6, 3), sms(6, 6), sms(7, 1)], spreadEvery: 2, interruptEvery: 6,
    categories: ["bank", "family", "gov"], stars: [0, 760, 1050], specials: ["row", "col", "notify"],
    hint: "Збери літеру Г або Т з п'яти — отримаєш «Сповіщення», вибух 3×3!" },
  { id: "1-6", chapter: 1, title: "Фінальна перевірка", moves: 27, goals: [{ type: "fakes", n: 14 }, { type: "collect", kind: 2, n: 20 }],
    initialFakes: [sms(0, 1), sms(0, 5), sms(2, 3), sms(3, 0), sms(3, 6), sms(5, 2), sms(5, 4), sms(7, 0), sms(7, 3), sms(7, 6)],
    spreadEvery: 1, interruptEvery: 6,
    categories: ["bank", "family", "gov", "games"], stars: [0, 880, 1200], specials: ["row", "col", "notify"],
    hint: "Фейки розповзаються щоходу. Гаси їх швидко — і не ведись на повідомлення!" },
]
