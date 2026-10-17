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

// Chapters 2–4. Fakes sit on well-spaced cells (no two touch); a pattern
// string picks the type per fake: s = sms, a = ad (2 hits), c = call, f = forgery.
const SPACED: [number, number][] = [[0, 1], [3, 4], [6, 1], [2, 6], [5, 3], [1, 3], [4, 0], [7, 6], [3, 2], [0, 5], [6, 5], [2, 0], [4, 6], [7, 0], [7, 3]]
const TYPE = { s: ["sms", 1], a: ["ad", 2], c: ["call", 1], f: ["forgery", 1] } as const
function fakes(pattern: string, shift = 0) {
  return [...pattern].map((ch, k) => {
    const [r, c] = SPACED[(k + shift) % SPACED.length]
    const [fake, hp] = TYPE[ch as keyof typeof TYPE]
    return { index: at(r, c), fake, hp }
  })
}
const L3: LevelDef["specials"] = ["row", "col", "notify"]
const L4: LevelDef["specials"] = ["row", "col", "notify", "kep"]

export const CHAPTER2: LevelDef[] = [
  { id: "2-1", chapter: 2, title: "Безпечна доставка", moves: 22, goals: [{ type: "fakes", n: 6 }, { type: "collect", kind: 4, n: 15 }],
    initialFakes: fakes("aasaas"), spreadEvery: 3, interruptEvery: 6, categories: ["marketplace", "bank"], stars: [0, 560, 780], specials: L3,
    hint: "Нові фейки — оголошення в рамці. Їх треба вдарити двічі: спершу злетить рамка!" },
  { id: "2-2", chapter: 2, title: "Повна передоплата", moves: 22, goals: [{ type: "fakes", n: 8 }, { type: "collect", kind: 5, n: 15 }],
    initialFakes: fakes("asasaas", 2), spreadEvery: 2, interruptEvery: 6, categories: ["marketplace", "bank", "games"], stars: [0, 620, 860], specials: L3,
    hint: "Ціна дуже низька, а продавець просить усе наперед? Це класичний фейк." },
  { id: "2-3", chapter: 2, title: "Кур’єр без посилки", moves: 23, goals: [{ type: "fakes", n: 9 }, { type: "collect", kind: 2, n: 16 }],
    initialFakes: fakes("aasasaas", 4), spreadEvery: 2, interruptEvery: 6, categories: ["marketplace", "social"], stars: [0, 680, 940], specials: L3,
    hint: "Платимо й спілкуємося лише всередині сайту оголошень — так безпечніше." },
  { id: "2-4", chapter: 2, title: "Зайві гроші", moves: 24, goals: [{ type: "fakes", n: 11 }, { type: "collect", kind: 3, n: 16 }],
    initialFakes: fakes("asaasaasa", 6), spreadEvery: 2, interruptEvery: 6, categories: ["marketplace", "bank", "social"], stars: [0, 760, 1050], specials: L3,
    hint: "«Я переказав вам забагато, поверніть» — перевір баланс у застосунку банку!" },
  { id: "2-5", chapter: 2, title: "Квартира мрії", moves: 25, goals: [{ type: "fakes", n: 12 }, { type: "collect", kind: 1, n: 18 }],
    initialFakes: fakes("aasaasaasa", 8), spreadEvery: 2, interruptEvery: 6, categories: ["marketplace", "games", "social"], stars: [0, 820, 1120], specials: L3,
    hint: "Не плати за те, чого не бачив. «Покажу після передоплати» — тривожний знак." },
  { id: "2-6", chapter: 2, title: "Великий розпродаж", moves: 27, goals: [{ type: "fakes", n: 14 }, { type: "collect", kind: 0, n: 20 }],
    initialFakes: fakes("aasaasaasaa", 10), spreadEvery: 1, interruptEvery: 6, categories: ["marketplace", "bank", "games", "social"], stars: [0, 900, 1250], specials: L3,
    hint: "Фінал розділу: фейки розповзаються щоходу. Б’й оголошення двічі й не ведись!" },
]

export const CHAPTER3: LevelDef[] = [
  { id: "3-1", chapter: 3, title: "Невідомий номер", moves: 22, goals: [{ type: "fakes", n: 6 }, { type: "collect", kind: 3, n: 15 }],
    initialFakes: fakes("ccsccs", 1), spreadEvery: 3, interruptEvery: 6, categories: ["family", "bank"], stars: [0, 560, 780], specials: L3,
    hint: "Дзвінок-фейк не стоїть на місці — щоходу перескакує. Лови його збігом поруч!" },
  { id: "3-2", chapter: 3, title: "Мамо, це я", moves: 23, goals: [{ type: "fakes", n: 8 }, { type: "collect", kind: 5, n: 16 }],
    initialFakes: fakes("csccsacs", 3), spreadEvery: 2, interruptEvery: 6, categories: ["family", "social"], stars: [0, 640, 880], specials: L4,
    hint: "Склади п’ять в одну лінію — отримаєш КЕП! Поміняй його з річчю, і всі такі речі зникнуть." },
  { id: "3-3", chapter: 3, title: "Друг просить позичити", moves: 24, goals: [{ type: "fakes", n: 10 }, { type: "collect", kind: 4, n: 16 }],
    initialFakes: fakes("ccsacsca", 5), spreadEvery: 2, interruptEvery: 6, categories: ["family", "social", "games"], stars: [0, 720, 990], specials: L4,
    hint: "Друг пише «терміново позич»? Зателефонуй йому звичайним дзвінком." },
  { id: "3-4", chapter: 3, title: "Голос онука", moves: 24, goals: [{ type: "fakes", n: 11 }, { type: "collect", kind: 2, n: 18 }],
    initialFakes: fakes("cscacsacs", 7), spreadEvery: 2, interruptEvery: 6, categories: ["family", "bank"], stars: [0, 780, 1070], specials: L4,
    hint: "Шахраї вміють підробляти голос. Поклади слухавку й передзвони сам." },
  { id: "3-5", chapter: 3, title: "Слідчий на лінії", moves: 25, goals: [{ type: "fakes", n: 12 }, { type: "collect", kind: 0, n: 18 }],
    initialFakes: fakes("ccasccasca", 9), spreadEvery: 2, interruptEvery: 6, categories: ["family", "social", "bank"], stars: [0, 840, 1150], specials: L4,
    hint: "Поліція не «закриває справи» за гроші й не присилає кур’єрів." },
  { id: "3-6", chapter: 3, title: "Родинне свято", moves: 27, goals: [{ type: "fakes", n: 14 }, { type: "collect", kind: 1, n: 20 }],
    initialFakes: fakes("cacsccascac", 11), spreadEvery: 1, interruptEvery: 6, categories: ["family", "social", "games", "bank"], stars: [0, 920, 1270], specials: L4,
    hint: "Фінал розділу: дзвінки скачуть, фейки ростуть. КЕП тобі на допомогу!" },
]

export const CHAPTER4: LevelDef[] = [
  { id: "4-1", chapter: 4, title: "Оновіть дані в Дії", moves: 22, goals: [{ type: "fakes", n: 6 }, { type: "collect", kind: 0, n: 15 }],
    initialFakes: fakes("ffsffs", 2), spreadEvery: 3, interruptEvery: 6, categories: ["gov", "social"], stars: [0, 580, 800], specials: L4,
    hint: "Підробка маскується під звичайну річ і не складається в ряд. Збіг поруч зриває маску — тоді її можна погасити." },
  { id: "4-2", chapter: 4, title: "Виграш у розіграші", moves: 23, goals: [{ type: "fakes", n: 8 }, { type: "collect", kind: 4, n: 16 }],
    initialFakes: fakes("fsfafsfc", 4), spreadEvery: 2, interruptEvery: 6, categories: ["social", "gov", "games"], stars: [0, 660, 900], specials: L4, combos: true,
    hint: "Поміняй місцями дві спецплитки — буде супер-комбо: хрест, великий вибух або все поле!" },
  { id: "4-3", chapter: 4, title: "Легкі гроші", moves: 24, goals: [{ type: "fakes", n: 10 }, { type: "collect", kind: 3, n: 16 }],
    initialFakes: fakes("ffascfsf", 6), spreadEvery: 2, interruptEvery: 6, categories: ["work_invest", "social"], stars: [0, 740, 1010], specials: L4, combos: true,
    hint: "«2000 гривень на день за лайки» і внесок наперед — це не робота, а пастка." },
  { id: "4-4", chapter: 4, title: "Штраф зі знижкою", moves: 25, goals: [{ type: "fakes", n: 11 }, { type: "collect", kind: 5, n: 18 }],
    initialFakes: fakes("fsfcfafsf", 8), spreadEvery: 2, interruptEvery: 6, categories: ["gov", "work_invest", "marketplace"], stars: [0, 800, 1100], specials: L4, combos: true,
    hint: "Офіційні сайти держави закінчуються на gov.ua. Інші домени — під підозрою." },
  { id: "4-5", chapter: 4, title: "Інвестиції мрії", moves: 26, goals: [{ type: "fakes", n: 12 }, { type: "collect", kind: 2, n: 18 }],
    initialFakes: fakes("ffcafsfcfs", 10), spreadEvery: 2, interruptEvery: 6, categories: ["work_invest", "social", "gov"], stars: [0, 860, 1180], specials: L4, combos: true,
    hint: "Гарантованого доходу 40% на місяць не буває. Ніколи." },
  { id: "4-6", chapter: 4, title: "Кібергерой", moves: 28, goals: [{ type: "fakes", n: 15 }, { type: "collect", kind: 1, n: 20 }],
    initialFakes: fakes("fafcfsfacfs", 12), spreadEvery: 1, interruptEvery: 6, categories: ["gov", "social", "work_invest", "marketplace", "games"], stars: [0, 960, 1320], specials: L4, combos: true,
    hint: "Фінальна перевірка! Підробки, дзвінки й оголошення разом. Покажи, що тебе не обдурити!" },
]

export const CHAPTERS = [
  { n: 1, title: "Банк", levels: CHAPTER1 },
  { n: 2, title: "Маркетплейс", levels: CHAPTER2 },
  { n: 3, title: "Родина", levels: CHAPTER3 },
  { n: 4, title: "Держпослуги й соцмережі", levels: CHAPTER4 },
]
export const LEVELS: LevelDef[] = CHAPTERS.flatMap((c) => c.levels)
