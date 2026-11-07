import { EXERCISE_BANK, coversOf, defaultEquipment, isCore, ratingFor } from './exercises'
import { STRETCH_BY_ID } from './stretches'
import { COMPOUND_LIFTS } from './workout'

// Building a targeted workout: the areas you can pick, what each one covers,
// and how its exercises and stretches are chosen from the banks.

// Each area: the coverage areas it trains (see coversOf), the order its
// exercises are picked in (`slots`, so four shoulder exercises hit the front,
// side and rear and not four presses), the body-map regions it lights up,
// and its stretches, best first.
export const TARGET_AREAS = [
  { id: 'chest', label: 'Chest', tags: ['chest'], slots: ['chest'], view: 'front', regions: ['chest'],
    stretches: ['doorway-pec', 'wall-pec', 'floor-pec', 'behind-back-clasp', 'reverse-prayer'] },
  { id: 'back', label: 'Back', tags: ['lats', 'traps', 'lower-back'], slots: ['lats', 'traps', 'lats', 'lower-back'], view: 'back', regions: ['back'],
    stretches: ['lat-stretch', 'childs-pose', 'doorway-lat', 'open-book', 'cat-cow', 'side-childs-pose'] },
  { id: 'shoulders', label: 'Shoulders', tags: ['front-delts', 'side-delts', 'rear-delts'], slots: ['front-delts', 'side-delts', 'rear-delts', 'side-delts'], view: 'front', regions: ['shoulders'],
    stretches: ['cross-body-shoulder', 'thread-the-needle', 'sleeper-stretch', 'eagle-arms', 'cow-face-arms'] },
  { id: 'arms', label: 'Arms', tags: ['biceps', 'triceps'], slots: ['biceps', 'triceps'], view: 'front', regions: ['arms'],
    stretches: ['overhead-tricep-stretch', 'bicep-wall', 'wrist-flexor', 'tricep-wall', 'wrist-extensor'] },
  { id: 'quads', label: 'Quads', tags: ['quads', 'inner-thighs'], slots: ['quads'], view: 'front', regions: ['thighs'],
    stretches: ['quad-stretch', 'couch-stretch', 'kneeling-quad', 'hip-flexor', 'heel-sit'] },
  { id: 'glutes', label: 'Glutes', tags: ['glutes', 'outer-thighs'], slots: ['glutes', 'glutes', 'outer-thighs', 'glutes'], view: 'back', regions: ['hips'],
    stretches: ['figure-4', 'pigeon-pose', 'seated-glute', '90-90', 'standing-figure-4'] },
  { id: 'hamstrings', label: 'Hamstrings', tags: ['hamstrings'], slots: ['hamstrings'], view: 'back', regions: ['thighs'],
    stretches: ['hamstring-stretch', 'standing-hamstring', 'half-split', 'pyramid-pose', 'doorway-hamstring'] },
  { id: 'calves', label: 'Calves', tags: ['calves'], slots: ['calves'], view: 'back', regions: ['calves'],
    stretches: ['wall-calf-stretch', 'bent-knee-calf', 'step-calf-drop', 'downward-dog', 'towel-calf'] },
  { id: 'core', label: 'Core', tags: ['abs', 'obliques'], slots: ['abs', 'obliques'], view: 'front', regions: ['core'],
    stretches: ['cobra-pose', 'side-bend', 'banana-stretch', 'sphinx-pose', 'gate-pose'] },
]
export const TARGET_AREA_BY_ID = Object.fromEntries(TARGET_AREAS.map(a => [a.id, a]))

// What you're working with: anything at the gym, a pair of dumbbells, or
// nothing at all.
export const TARGET_EQUIPMENT = [
  { id: 'gym', label: 'Gym Equipment', name: 'Gym Equipment' },
  { id: 'db', label: 'Dumbbells', name: 'Dumbbells' },
  { id: 'none', label: 'None', name: 'No Equipment' },
]

// Done without weights but needing gym gear (a bar to hang from, a bench made
// for it), so they're left out at home.
const GEAR = new Set(['dips', 'weighted-dips', 'hanging-leg-raises', 'toes-to-bar', 'captains-chair', 'glute-ham-raise',
  'reverse-hyper', 'back-extensions', 'decline-sit-ups', 'dragon-flag', 'inverted-row', 'box-jumps', 'ab-wheel'])

export function fitsEquipment(exercise, eq) {
  if (eq === 'gym') return true
  if (GEAR.has(exercise.id) || exercise.gear) return false
  const kind = defaultEquipment(exercise)
  return kind === 'bodyweight' || (eq === 'db' && kind === 'dumbbell')
}

// How big a workout is: the exercises and stretches for `n` areas in all,
// growing with the areas but leveling off, so a session stays about 45–60
// minutes with 5–8 of stretching.
export const exerciseTotal = n => [0, 4, 6, 7, 8, 8][n] ?? 9
export const stretchTotal = n => [0, 3, 4, 5][n] ?? 6

// Bigger areas first, for whatever doesn't share out evenly.
const BY_SIZE = ['back', 'chest', 'quads', 'glutes', 'shoulders', 'hamstrings', 'arms', 'core', 'calves']

// `total` shared across `areas`, as { [areaId]: count }: the same for each,
// and what's left over one each to the biggest.
export function share(total, areas) {
  const sorted = BY_SIZE.filter(id => areas.includes(id))
  const base = Math.floor(total / sorted.length)
  const extra = total % sorted.length
  return Object.fromEntries(sorted.map((id, i) => [id, base + (i < extra ? 1 : 0)]))
}

// "Chest & Glutes", "Chest, Back & Arms", "Chest, Back & 2 more".
export function targetName(areas) {
  if (areas.length === TARGET_AREAS.length) return 'Full Body'
  const labels = TARGET_AREAS.filter(a => areas.includes(a.id)).map(a => a.label)
  if (labels.length <= 2) return labels.join(' & ')
  if (labels.length === 3) return `${labels[0]}, ${labels[1]} & ${labels[2]}`
  return `${labels[0]}, ${labels[1]} & ${labels.length - 2} more`
}
export const equipmentName = eq => TARGET_EQUIPMENT.find(x => x.id === eq)?.name ?? ''

const BEST = ['push', 'legsQuad', 'pull', 'legsPost', 'core']
const best = ex => BEST.some(p => ratingFor(ex, p) === 3)
const compound = ex => ex.compound || COMPOUND_LIFTS.has(ex.id)

// The workout for `areas` with `eq`: { main, core, stretches } as ids, in
// the order they're done. For each area, a pick per slot: the exercise that
// mainly works that slot's area, preferring the most effective ones, ones
// that use what you have (dumbbells on a dumbbell day; core work is fine
// either way), big lifts first and
// lighter ones after, and ones you already know (`known`: exercises you have
// numbers for); ones in your last targeted workout (`recent`) go to the
// back, so doing the same areas again mixes it up. How many each area gets:
// see share. Adding to one under way, `among` is every area it'll have (each
// new one gets its share of a workout that size) and `taken` what it
// already has.
// Each pick comes with its slot (`slots`: { area, muscle, suggest } for
// exercises, `stretchSlots`: { area, suggest } for stretches): a workout
// starts with them empty, and the pick is what's suggested for each.
export function buildTargeted(areas, eq, { known = new Set(), recent = new Set(), among = areas, taken = [] } = {}) {
  const picked = TARGET_AREAS.filter(a => areas.includes(a.id))
  const counts = share(exerciseTotal(among.length), among)
  const used = new Set(taken)
  const main = []
  const core = []
  const slots = []
  for (const area of picked) {
    const pool = EXERCISE_BANK.filter(ex =>
      (area.id === 'core') === isCore(ex) && fitsEquipment(ex, eq) && coversOf(ex).some(t => area.tags.includes(t)))
    for (let i = 0; i < counts[area.id]; i++) {
      const slot = area.slots[i % area.slots.length]
      const score = ex => {
        const covers = coversOf(ex)
        const kind = defaultEquipment(ex)
        const uses = eq === 'db' ? kind === 'dumbbell' : eq === 'gym' ? kind !== 'bodyweight' : true
        return (covers[0] === slot ? 3 : 0) + (area.tags.includes(covers[0]) ? 1.5 : 0) + (covers.includes(slot) ? 0.5 : 0) +
          (best(ex) ? 1 : 0) + (uses && area.id !== 'core' ? 0.75 : 0) + (compound(ex) ? (i < 2 ? 0.75 : -0.75) : 0) +
          (known.has(ex.id) ? 1 : 0) - (recent.has(ex.id) ? 2 : 0)
      }
      const next = pool.filter(ex => !used.has(ex.id)).reduce((top, ex) => (!top || score(ex) > score(top) ? ex : top), null)
      if (!next) break
      used.add(next.id)
      ;(area.id === 'core' ? core : main).push(next.id)
      slots.push({ area: area.id, muscle: slot, suggest: next.id })
    }
  }
  const stretchCounts = share(stretchTotal(among.length), among)
  const stretches = []
  const stretchSlots = []
  for (const area of picked) {
    const list = area.stretches.filter(id => STRETCH_BY_ID[id] && !stretches.includes(id) && !used.has(id))
    const fresh = [...list.filter(id => !recent.has(id)), ...list.filter(id => recent.has(id))].slice(0, stretchCounts[area.id])
    stretches.push(...fresh)
    stretchSlots.push(...fresh.map(id => ({ area: area.id, suggest: id })))
  }
  return { main, core, stretches, slots, stretchSlots }
}

// What each exercise slot is for, as it's shown: "Lats exercise".
export const MUSCLE_LABEL = {
  chest: 'Chest', lats: 'Lats', traps: 'Traps', 'lower-back': 'Lower back', 'front-delts': 'Front delts',
  'side-delts': 'Side delts', 'rear-delts': 'Rear delts', biceps: 'Biceps', triceps: 'Triceps', quads: 'Quads',
  glutes: 'Glutes', 'outer-thighs': 'Outer thighs', hamstrings: 'Hamstrings', calves: 'Calves', abs: 'Abs', obliques: 'Obliques',
}

// What can go in an exercise slot with `eq`, not counting `skip` (what the
// workout has): ones that mainly work its muscle, then ones that work it
// too, then the rest of its area's, the most effective first in each.
export function slotChoices({ area, muscle }, eq, skip = []) {
  const a = TARGET_AREA_BY_ID[area]
  const tier = ex => {
    const covers = coversOf(ex)
    return covers[0] === muscle ? 0 : covers.includes(muscle) ? 1 : 2
  }
  return EXERCISE_BANK
    .filter(ex => (area === 'core') === isCore(ex) && fitsEquipment(ex, eq) && coversOf(ex).some(t => a.tags.includes(t)) && !skip.includes(ex.id))
    .map(ex => ({ ex, tier: tier(ex) }))
    .sort((x, y) => x.tier - y.tier || Number(best(y.ex)) - Number(best(x.ex)))
}
