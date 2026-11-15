// Searching USDA FoodData Central (public domain): its ~12,700 generic foods
// (SR Legacy and FNDDS) ship with the app and work offline; packaged,
// branded foods come from its free API when you're online.
import { newId } from './nutrition'

// A free api.data.gov key, shared by everyone using the app: 1,000
// searches an hour in all. It only reads public USDA data.
const FDC_KEY = 'BHnzwRwJLC7ffBcdcj6tfh6nqPTKwTTkJ6fcp8Qr'

// ── Generic foods (bundled) ───────────────────────────────────────────────
// Each row: [name, cal, fat, carbs, fiber, protein] per 100 g, then one
// household serving [amount, unit, grams] when USDA lists one. Fiber is null
// when USDA doesn't list it, and there's never an added sugar figure (USDA
// gives total sugar only). `missing` names those, so the app can ask.
let generic = null
export function loadGeneric() {
  generic ??= import('../data/usda-foods.json').then(m => m.default.map(r => ({ row: r, low: r[0].toLowerCase() })))
  return generic
}

function genericFood(r) {
  const [name, cal, fat, carbs, fiber, protein, amt, unit, grams] = r
  const k = grams ? grams / 100 : 1
  return {
    id: newId(),
    usda: true,
    name,
    serving: grams ? { amount: amt, unit, weight: grams, wunit: 'g' } : { amount: 100, unit: 'g', weight: null, wunit: 'g' },
    per: { cal: cal * k, fat: fat * k, carbs: carbs * k, fiber: (fiber ?? 0) * k, sugar: 0, protein: protein * k },
    missing: fiber == null ? ['fiber', 'sugar'] : ['sugar'],
  }
}

// USDA's names for things people call something else: a red bell pepper is
// "Peppers, sweet, red, raw". A word you type matches its own spelling or
// any of these.
const ALIASES = {
  bell: ['sweet'],
  capsicum: ['peppers, sweet'],
  garbanzo: ['chickpea'],
  chickpea: ['garbanzo'],
  scallion: ['onions, spring'],
  scallions: ['onions, spring'],
  cilantro: ['coriander'],
  courgette: ['zucchini'],
  aubergine: ['eggplant'],
  yam: ['sweet potato'],
  edamame: ['soybeans, green'],
  oatmeal: ['oats'],
  hamburger: ['ground beef', 'beef, ground'],
  oj: ['orange juice'],
  pb: ['peanut butter'],
}
const hasWord = (low, w) => low.includes(w) || (ALIASES[w] ?? []).some(a => low.includes(a))

// Every word you type has to be in the name (or an alias of it). First come
// names that start with it as a whole word ("Egg, whole" for egg), then ones
// that start with it at all ("Eggnog"), then the rest; shorter (plainer)
// names first in each. If nothing has every word, names missing just one
// show instead, so an extra word ("fresh", "organic") doesn't empty the list.
export function searchGeneric(list, query, max = 15) {
  const q = query.trim().toLowerCase()
  const words = q.split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const find = need => {
    const hits = []
    for (const f of list) {
      const missed = words.filter(w => !hasWord(f.low, w)).length
      if (missed > need) continue
      const whole = f.low.startsWith(q) && !/[a-z]/.test(f.low[q.length] ?? '')
      const score = missed * 10000 + (whole ? 0 : f.low.startsWith(q) ? 1 : f.low.startsWith(words[0]) ? 2 : 3) * 1000 + f.low.length
      hits.push([score, f])
    }
    return hits
  }
  let hits = find(0)
  if (!hits.length && words.length > 1) hits = find(1)
  // The same name twice (SR Legacy and FNDDS both have it) shows once.
  const seen = new Set()
  return hits.sort((a, b) => a[0] - b[0]).filter(([, f]) => !seen.has(f.low) && seen.add(f.low)).slice(0, max).map(([, f]) => genericFood(f.row))
}

// ── Branded foods (online) ────────────────────────────────────────────────
const title = s => (s && s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s(/-])\S/g, c => c.toUpperCase()) : s ?? '')

const BRANDED = [['cal', '208'], ['fat', '204'], ['carbs', '205'], ['fiber', '291'], ['sugar', '539'], ['protein', '203']]

function brandedFood(f) {
  const v = {}
  for (const x of f.foodNutrients ?? []) v[x.nutrientNumber] = x.value
  if (v['208'] == null) return null
  // The API gives amounts per 100 g (or ml); the label's serving scales them.
  const size = f.servingSize
  const metric = /^(g|grm|ml|mlt)$/i.test(f.servingSizeUnit ?? '')
  const k = size && metric ? size / 100 : 1
  const wunit = /^(ml|mlt)$/i.test(f.servingSizeUnit ?? '') ? 'ml' : 'g'
  const house = (f.householdServingFullText ?? '').trim()
  const m = house.match(/^(\d+(?:\.\d+)?|\d+\/\d+)\s+(.+)$/)
  const amt = m ? (m[1].includes('/') ? m[1].split('/').reduce((a, b) => a / b) : parseFloat(m[1])) : null
  const serving = size && metric
    ? (amt ? { amount: amt, unit: m[2].toLowerCase().slice(0, 24), weight: Math.round(size), wunit } : { amount: Math.round(size), unit: wunit, weight: null, wunit })
    : { amount: 100, unit: 'g', weight: null, wunit: 'g' }
  const brand = title(f.brandName || f.brandOwner) || undefined
  // "Chobani Yogurt, Greek" under the brand Chobani reads as "Yogurt, Greek".
  const name = title(f.description)
  const own = brand && name.toLowerCase().startsWith(`${brand.toLowerCase()} `) ? name.slice(brand.length + 1) : name
  return {
    id: newId(),
    usda: true,
    fdcId: f.fdcId,
    barcode: f.gtinUpc || undefined,
    name: own,
    brand,
    serving,
    per: Object.fromEntries(BRANDED.map(([k2, num]) => [k2, (v[num] ?? 0) * k])),
    missing: BRANDED.filter(([, num]) => v[num] == null).map(([k2]) => k2),
  }
}

export async function searchBranded(query, signal) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${FDC_KEY}&dataType=Branded&pageSize=20&query=${encodeURIComponent(query)}`
  const r = await fetch(url, { signal })
  if (!r.ok) throw new Error(r.status === 429 ? 'limit' : 'failed')
  const j = await r.json()
  return (j.foods ?? []).map(brandedFood).filter(Boolean)
}
