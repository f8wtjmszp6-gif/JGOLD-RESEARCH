// Nutrition: what a day's food adds up to, saved foods, water and body weight.
// Everything lives under `nutrition` in the app's saved state:
//   goals:   { cal, fat, carbs, fiber, sugar, protein, water }
//   days:    { 'YYYY-MM-DD': { breakfast: [entry], lunch, dinner, snacks, water: [oz] } }
//   foods:   [{ id, name, serving: { amount, unit, weight, wunit }, per: {…}, ingredients?, makes? }]
//            My foods: only ones you made (typed in or built). Foods from
//            USDA or a barcode aren't saved; logging one keeps a copy in
//            the entry, and Popular finds it again from there.
// An ingredient is { food, servings }: its own copy of the food, so it's
// edited with the food it's in, not on its own. (Older ones are { foodId,
// servings }, pointing at a saved food.)
//   weights: { 'YYYY-MM-DD': lb }
// An entry is { id, foodId?, name, servings, serving, per } — `per` is one
// serving's numbers, so changing how many never loses them. One from USDA
// or a barcode also has `looked` with where it came from (LOOKED keys).

// In the order a food label lists them. `sub`: part of carbs (indented).
// `kind`: goal (reach it), limit (stay under) or guide (no goal either way).
export const NUTRIENTS = [
  { key: 'cal', label: 'Calories', short: 'Cal', unit: '', kind: 'goal' },
  { key: 'fat', label: 'Fat', short: 'Fat', unit: 'g', kind: 'guide' },
  { key: 'carbs', label: 'Carbs', short: 'Carbs', unit: 'g', kind: 'guide' },
  { key: 'fiber', label: 'Fiber', short: 'Fiber', unit: 'g', kind: 'goal', sub: true },
  { key: 'sugar', label: 'Added sugar', short: 'Sugar', unit: 'g', kind: 'limit', sub: true },
  { key: 'protein', label: 'Protein', short: 'Protein', unit: 'g', kind: 'goal' },
]

export const MEALS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner'], ['snacks', 'Snacks']]
export const mealName = id => MEALS.find(([m]) => m === id)?.[1] ?? 'Snacks'

export const UNITS = ['cup', 'tbsp', 'tsp', 'g', 'oz', 'fl oz', 'mL', 'serving', 'piece', 'slice', 'bar', 'scoop']
export const GLASSES = [8, 12, 16, 20, 24]

export const DEFAULT_GOALS = { cal: 2200, fat: 80, carbs: 275, fiber: 30, sugar: 36, protein: 150, water: 96 }

export const ZERO = { cal: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0, protein: 0 }

// This phone's calendar day, as a key.
export function dayKey(d = new Date()) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const goalsOf = n => ({ ...DEFAULT_GOALS, ...n?.goals })
export const dayOf = (n, key = dayKey()) => n?.days?.[key] ?? {}
export const foodsOf = n => n?.foods ?? []

// The meal it's probably for, from the time.
export function mealNow(d = new Date()) {
  const h = d.getHours()
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snacks'
}

export function scale(per, times) {
  return Object.fromEntries(Object.keys(ZERO).map(k => [k, (per?.[k] ?? 0) * times]))
}

export function add(a, b) {
  return Object.fromEntries(Object.keys(ZERO).map(k => [k, (a[k] ?? 0) + (b[k] ?? 0)]))
}

export const entryTotal = e => scale(e.per, e.servings)
export const mealTotal = list => (list ?? []).reduce((t, e) => add(t, entryTotal(e)), ZERO)
export const dayTotal = day => MEALS.reduce((t, [m]) => add(t, mealTotal(day[m])), ZERO)

// Whole numbers, with a comma past a thousand.
export const num = v => Math.round(v).toLocaleString('en-US')
export const val = (k, v) => `${num(v)}${NUTRIENTS.find(x => x.key === k)?.unit ?? ''}`

// ½, 1½, ¼… for amounts and servings.
const FRACTIONS = { 0.25: '¼', 0.5: '½', 0.75: '¾' }
export function amount(v) {
  const whole = Math.floor(v)
  const part = Math.round((v - whole) * 100) / 100
  if (part === 0) return String(whole)
  if (FRACTIONS[part]) return `${whole || ''}${FRACTIONS[part]}`
  return String(Math.round(v * 100) / 100)
}

// "1 cup · 240 g", or "2 cups" — scaled by `times`.
export function servingText(serving, times = 1) {
  if (!serving) return '1 serving'
  const n = serving.amount * times
  const plural = n > 1 && ['cup', 'piece', 'slice', 'scoop', 'serving'].includes(serving.unit) ? 's' : ''
  const main = `${amount(n)} ${serving.unit}${plural}`
  return serving.weight ? `${main} · ${num(serving.weight * times)} ${serving.wunit ?? 'g'}` : main
}

// Where a looked-up food came from, kept on the entries that log it.
export const LOOKED = ['usda', 'off', 'brand', 'barcode', 'fdcId']
export const lookedOf = food => (food.usda || food.off ? Object.fromEntries(LOOKED.filter(k => food[k] != null).map(k => [k, food[k]])) : undefined)

// Your most-logged foods for a meal (then most-logged overall), up to `max`:
// your own foods, and foods from USDA or a barcode you've logged (rebuilt
// from the entry, the same food by name and brand). Your foods you haven't
// logged yet come last.
export function popularFoods(n, meal, max = 7) {
  const saved = Object.fromEntries(foodsOf(n).map(f => [f.id, f]))
  const seen = {} // key -> { food, here, all }
  for (const day of Object.values(n?.days ?? {})) {
    for (const [m] of MEALS) {
      for (const e of day[m] ?? []) {
        const mine = e.foodId && saved[e.foodId]
        if (!mine && !e.looked) continue
        const key = mine ? e.foodId : `${e.name}|${e.looked.brand ?? ''}`
        const x = (seen[key] ??= { food: mine || { id: e.foodId, name: e.name, serving: e.serving, per: e.per, ...e.looked }, here: 0, all: 0 })
        x.all++
        if (m === meal) x.here++
      }
    }
  }
  const logged = Object.values(seen).sort((a, b) => b.here - a.here || b.all - a.all).map(x => x.food)
  return [...logged, ...foodsOf(n).filter(f => !seen[f.id])].slice(0, max)
}

// An ingredient's food: its own copy, or (older ones) the saved food.
export const ingredientFood = (n, i) => i.food ?? foodsOf(n).find(x => x.id === i.foodId)

// A food made of other foods: one serving's numbers, from what's in it
// split across how many servings it makes.
export function fromIngredients(n, ingredients, makes) {
  const total = ingredients.reduce((t, i) => {
    const f = ingredientFood(n, i)
    return f ? add(t, scale(f.per, i.servings)) : t
  }, ZERO)
  return scale(total, 1 / Math.max(1, makes))
}

// This week's days (Sunday first) with what you weighed, and their average.
export function weightWeek(n, days) {
  const list = days.map(d => ({ date: d, key: dayKey(d), lb: n?.weights?.[dayKey(d)] ?? null }))
  const logged = list.filter(x => x.lb != null)
  const avg = logged.length ? logged.reduce((t, x) => t + x.lb, 0) / logged.length : null
  return { list, avg }
}

export const lastWeight = n => {
  const keys = Object.keys(n?.weights ?? {}).sort()
  return keys.length ? n.weights[keys[keys.length - 1]] : null
}

export const newId = () => Math.random().toString(36).slice(2, 10)
