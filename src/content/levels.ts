import type { LevelDef } from "../logic/level"

// Chapter 1 «Банк». Board is 7×8, index = row * 7 + col.
const at = (r: number, c: number) => r * 7 + c
const sms = (r: number, c: number) => ({ index: at(r, c), fake: "sms" as const, hp: 1 })

export const CHAPTER1: LevelDef[] = [
  { id: "1-1", chapter: 1, title: "Перше SMS", moves: 20, goals: [{ type: "fakes", n: 3 }],
    initialFakes: [sms(4, 2), sms(4, 3), sms(4, 4)], spreadEvery: 3, interruptEvery: 6,
    categories: ["bank", "games"], stars: [0, 520, 820], specials: [],
    hint: "Фейки ховаються серед звичайних речей. Збери три однакові поруч — і фейк зникне!" },
  { id: "1-2", chapter: 1, title: "Дзвінок «з банку»", moves: 20, goals: [{ type: "fakes", n: 5 }, { type: "collect", kind: 4, n: 10 }],
    initialFakes: [sms(3, 1), sms(3, 5), sms(5, 2), sms(5, 4), sms(6, 3)], spreadEvery: 3, interruptEvery: 6,
    categories: ["bank", "games"], stars: [0, 600, 950], specials: [],
    hint: "Банк ніколи не просить CVV чи код із SMS. Почуєш таке — це фейк!" },
  { id: "1-3", chapter: 1, title: "Код із SMS", moves: 20, goals: [{ type: "fakes", n: 6 }],
    initialFakes: [sms(2, 3), sms(4, 0), sms(4, 6), sms(6, 1), sms(6, 5), sms(7, 3)], spreadEvery: 2, interruptEvery: 7,
    categories: ["bank", "games"], stars: [0, 700, 1100], specials: ["row", "col"],
    hint: "Склади чотири в ряд — отримаєш 2FA: він вичищає весь ряд або стовпчик!" },
  { id: "1-4", chapter: 1, title: "Мамо, я в біді", moves: 22, goals: [{ type: "fakes", n: 8 }],
    initialFakes: [sms(3, 0), sms(3, 6), sms(4, 2), sms(4, 4), sms(6, 0), sms(6, 6), sms(7, 2), sms(7, 4)], spreadEvery: 2, interruptEvery: 7,
    categories: ["bank", "family", "games"], stars: [0, 850, 1300], specials: ["row", "col"],
    hint: "Шахраї тиснуть на емоції: «терміново», «нікому не кажи». Зупинись і перевір!" },
  { id: "1-5", chapter: 1, title: "Виплата від держави", moves: 22, goals: [{ type: "fakes", n: 9 }, { type: "collect", kind: 0, n: 12 }],
    initialFakes: [sms(2, 1), sms(2, 5), sms(4, 3), sms(5, 0), sms(5, 6), sms(6, 2), sms(6, 4), sms(7, 1), sms(7, 5)], spreadEvery: 2, interruptEvery: 7,
    categories: ["bank", "family", "gov"], stars: [0, 950, 1450], specials: ["row", "col", "notify"],
    hint: "Збери літеру Г або Т з п'яти — отримаєш «Сповіщення», вибух 3×3!" },
  { id: "1-6", chapter: 1, title: "Фінальна перевірка", moves: 24, goals: [{ type: "fakes", n: 12 }],
    initialFakes: [sms(1, 3), sms(3, 1), sms(3, 5), sms(4, 3), sms(5, 0), sms(5, 6), sms(6, 2), sms(6, 4), sms(7, 0), sms(7, 3), sms(7, 6), sms(2, 3)],
    spreadEvery: 1, interruptEvery: 7,
    categories: ["bank", "family", "gov", "games"], stars: [0, 1100, 1700], specials: ["row", "col", "notify"],
    hint: "Фейки розповзаються щоходу. Гаси їх швидко — і не ведись на повідомлення!" },
]
