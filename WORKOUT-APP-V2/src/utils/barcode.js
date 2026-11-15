// Looking a scanned barcode up: USDA's branded foods first (they carry the
// UPC), then Open Food Facts (free, crowd-sourced, millions of products).
// Either way the food comes back unsaved, like a USDA search result, and is
// saved the first time you log it.
import { newId } from './nutrition'
import { searchBranded } from './foodSearch'

// UPC-A, EAN-13 and GTIN-14 are the same number padded with zeros, so
// codes are compared without them.
const bare = code => String(code ?? '').replace(/\D/g, '').replace(/^0+/, '')
export const sameCode = (a, b) => !!bare(a) && bare(a) === bare(b)

// USDA stores codes at different lengths (12 to 14 digits) and its search
// matches the number exactly, so the 14-digit form is tried too.
async function fromUsda(code, signal) {
  for (const q of [...new Set([code, bare(code).padStart(14, '0')])]) {
    const hit = (await searchBranded(q, signal)).find(f => sameCode(f.barcode, code))
    if (hit) return hit
  }
  return null
}

const num = v => (v == null || v === '' || isNaN(Number(v)) ? null : Number(v))

async function fromOpenFoodFacts(code, signal) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,serving_size,serving_quantity,nutriments`
  const r = await fetch(url, { signal })
  if (r.status === 404) return null
  if (!r.ok) throw new Error('failed')
  const j = await r.json()
  const p = j.status === 1 ? j.product : null
  const n = p?.nutriments
  if (!p || !n || num(n['energy-kcal_100g'] ?? n['energy-kcal_serving']) == null) return null
  // Per serving when the label's serving is known, else per 100 g.
  const grams = num(p.serving_quantity)
  const perServing = grams && num(n['energy-kcal_serving']) != null
  // null when the product doesn't list it.
  const raw = key => {
    const g100 = num(n[`${key}_100g`])
    return perServing ? num(n[`${key}_serving`]) ?? (g100 == null ? null : g100 * grams / 100) : g100
  }
  const keys = { cal: 'energy-kcal', fat: 'fat', carbs: 'carbohydrates', fiber: 'fiber', sugar: 'added-sugars', protein: 'proteins' }
  const vals = Object.fromEntries(Object.entries(keys).map(([k, key]) => [k, raw(key)]))
  const house = String(p.serving_size ?? '').match(/^\s*(\d+(?:[.,]\d+)?)\s*([a-z][a-z\s]*?)\s*(?:\(|$)/i)
  const serving = perServing
    ? (house && !/^(g|ml)$/i.test(house[2])
      ? { amount: parseFloat(house[1].replace(',', '.')), unit: house[2].toLowerCase().slice(0, 24), weight: Math.round(grams), wunit: 'g' }
      : { amount: Math.round(grams), unit: 'g', weight: null, wunit: 'g' })
    : { amount: 100, unit: 'g', weight: null, wunit: 'g' }
  return {
    id: newId(),
    usda: true, // a looked-up food: saved the first time you log it
    off: true,
    barcode: code,
    name: (p.product_name || 'Scanned food').trim(),
    brand: String(p.brands ?? '').split(',')[0].trim() || undefined,
    serving,
    per: Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, v ?? 0])),
    missing: Object.keys(vals).filter(k => vals[k] == null),
  }
}

// The food for a barcode, or null when neither has it. Throws 'offline'
// when neither could be reached.
export async function lookupBarcode(code, signal) {
  let reached = false
  try {
    const f = await fromUsda(code, signal)
    reached = true
    if (f) return f
  } catch (e) {
    if (e.name === 'AbortError') throw e
  }
  try {
    const f = await fromOpenFoodFacts(code, signal)
    reached = true
    if (f) return f
  } catch (e) {
    if (e.name === 'AbortError') throw e
  }
  if (!reached) throw new Error('offline')
  return null
}
