import { EXERCISE_BANK, MUSCLE_LABEL, coversOf, defaultEquipment, isCore, primaryOf, ratingFor, ratingOn } from './exercises'
import { STRETCH_BANK, STRETCH_BY_ID } from './stretches'

// Building a targeted workout: the areas you can pick, what each one covers,
// and how its exercises and stretches are chosen from the banks.

// Each area: the coverage areas it trains (see coversOf), the order its
// exercises are picked in (`slots`, so four shoulder exercises hit the front,
// side and rear and not four presses), the body-map regions it lights up,
// and its stretches, best first.
export const TARGET_AREAS = [
  { id: 'chest', label: 'Chest', tags: ['chest'], view: 'front', regions: ['chest'],
    stretches: ['doorway-pec', 'wall-pec', 'floor-pec', 'behind-back-clasp', 'reverse-prayer'] },
  { id: 'back', label: 'Back', tags: ['lats', 'traps', 'lower-back'], view: 'back', regions: ['back'],
    stretches: ['lat-stretch', 'childs-pose', 'doorway-lat', 'open-book', 'cat-cow', 'side-childs-pose'] },
  { id: 'shoulders', label: 'Shoulders', tags: ['front-delts', 'side-delts', 'rear-delts'], view: 'front', regions: ['shoulders'],
    stretches: ['cross-body-shoulder', 'thread-the-needle', 'sleeper-stretch', 'eagle-arms', 'cow-face-arms'] },
  { id: 'arms', label: 'Arms', tags: ['biceps', 'triceps'], view: 'front', regions: ['arms'],
    stretches: ['overhead-tricep-stretch', 'bicep-wall', 'wrist-flexor', 'tricep-wall', 'wrist-extensor'] },
  { id: 'quads', label: 'Quads', tags: ['quads', 'inner-thighs'], view: 'front', regions: ['thighs'],
    stretches: ['quad-stretch', 'couch-stretch', 'kneeling-quad', 'hip-flexor', 'heel-sit'] },
  { id: 'glutes', label: 'Glutes', tags: ['glutes', 'outer-thighs'], view: 'back', regions: ['hips'],
    stretches: ['figure-4', 'pigeon-pose', 'seated-glute', '90-90', 'standing-figure-4'] },
  { id: 'hamstrings', label: 'Hamstrings', tags: ['hamstrings'], view: 'back', regions: ['thighs'],
    stretches: ['hamstring-stretch', 'standing-hamstring', 'half-split', 'pyramid-pose', 'doorway-hamstring'] },
  { id: 'calves', label: 'Calves', tags: ['calves'], view: 'back', regions: ['calves'],
    stretches: ['wall-calf-stretch', 'bent-knee-calf', 'step-calf-drop', 'downward-dog', 'towel-calf'] },
  { id: 'core', label: 'Core', tags: ['abs', 'obliques'], view: 'front', regions: ['core'],
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

// An area's stretches: its own list (best first), then any other that
// mainly stretches one of its muscles.
export function areaStretches(area) {
  const own = area.stretches.filter(id => STRETCH_BY_ID[id])
  return [...own, ...STRETCH_BANK.filter(x => !own.includes(x.id) && area.tags.includes(x.muscles?.[0])).map(x => x.id)]
}

// The stretches for one muscle, best first: those that stretch it most
// (rank 1), the area's own picks first; then rank 2, then rank 3.
export function muscleStretches(muscle, area) {
  const own = area?.stretches ?? []
  const rank = id => STRETCH_BY_ID[id].muscles.indexOf(muscle)
  return STRETCH_BANK.map(x => x.id).filter(id => rank(id) >= 0)
    .sort((x, y) => rank(x) - rank(y) || (own.includes(y) - own.includes(x)) || own.indexOf(x) - own.indexOf(y))
}

// A built workout has an exercise and a stretch for each muscle picked in
// its areas.

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

// Whether an exercise uses what you have: dumbbells on a dumbbell day, gym
// equipment at the gym (core work is fine either way).
export function usesEquipment(ex, eq) {
  if (isCore(ex)) return true
  const kind = defaultEquipment(ex)
  return eq === 'db' ? kind === 'dumbbell' : eq === 'gym' ? kind !== 'bodyweight' : true
}

// The workout for `areas` with `eq`: { main, core, stretches } as ids, in
// the order they're done. For each area, a pick per slot: the exercise that
// mainly works that slot's area, preferring the most effective ones, ones
// that use what you have (dumbbells on a dumbbell day; core work is fine
// either way), and ones you already know (`known`: exercises you have
// numbers for); ones in your last targeted workout (`recent`) go to the
// back, so doing the same areas again mixes it up. `taken`: what it
// already has.
// Each pick comes with its slot (`slots`: { area, muscle, suggest } for
// exercises, `stretchSlots`: { area, suggest } for stretches): a workout
// starts with them empty, and the pick is what's suggested for each.
export function buildTargeted(areas, eq, { known = new Set(), recent = new Set(), taken = [], muscles = {} } = {}) {
  const picked = TARGET_AREAS.filter(a => areas.includes(a.id))
  // One per muscle: `muscles` has the ones picked in an area (all of them
  // when it isn't given).
  const slotsOf = area => (muscles[area.id]?.length ? area.tags.filter(m => muscles[area.id].includes(m)) : area.tags)
  const used = new Set(taken)
  const main = []
  const core = []
  const slots = []
  for (const area of picked) {
    const pool = EXERCISE_BANK.filter(ex =>
      (area.id === 'core') === isCore(ex) && fitsEquipment(ex, eq) && coversOf(ex).some(t => area.tags.includes(t)))
    for (const slot of slotsOf(area)) {
      const score = ex => {
        const covers = coversOf(ex)
        const main = primaryOf(ex)
        return (main.includes(slot) ? 3 : 0) + (main.some(m => area.tags.includes(m)) ? 1.5 : 0) + (covers.includes(slot) ? 0.5 : 0) +
          (ratingOn(ex, slot) === 3 || (!covers.includes(slot) && best(ex)) ? 1 : 0) + (usesEquipment(ex, eq) && area.id !== 'core' ? 0.75 : 0) +
          (known.has(ex.id) ? 1 : 0) - (recent.has(ex.id) ? 2 : 0)
      }
      const next = pool.filter(ex => !used.has(ex.id)).reduce((top, ex) => (!top || score(ex) > score(top) ? ex : top), null)
      if (!next) continue
      used.add(next.id)
      ;(area.id === 'core' ? core : main).push(next.id)
      slots.push({ area: area.id, muscle: slot, suggest: next.id })
    }
  }
  // One stretch per muscle, as the plans pair them (see stretchAreas): for
  // each, one that stretches it most (rank 1), the area's own picks first,
  // then one that reaches it at all; ones in your last built workout last.
  const stretches = []
  const stretchSlots = []
  for (const area of picked) {
    for (const muscle of new Set(slotsOf(area))) {
      const id = muscleStretches(muscle, area).filter(x => !stretches.includes(x) && !used.has(x))
        .sort((x, y) => Number(recent.has(x)) - Number(recent.has(y)))[0]
      if (!id) continue
      stretches.push(id)
      stretchSlots.push({ area: area.id, muscle, suggest: id })
    }
  }
  return { main, core, stretches, slots, stretchSlots }
}

// What each exercise slot is for, as it's shown: "Lats exercise".
export { MUSCLE_LABEL }

// What can go in an exercise slot with `eq`, not counting `skip` (what the
// workout has): ones that mainly work its muscle, then ones that work it
// too, then the rest of its area's, the most effective first in each.
export function slotChoices({ area, muscle }, eq, skip = []) {
  const a = TARGET_AREA_BY_ID[area]
  const tier = ex => {
    const covers = coversOf(ex)
    return primaryOf(ex).includes(muscle) ? 0 : covers.includes(muscle) ? 1 : 2
  }
  return EXERCISE_BANK
    .filter(ex => (area === 'core') === isCore(ex) && fitsEquipment(ex, eq) && coversOf(ex).some(t => a.tags.includes(t)) && !skip.includes(ex.id))
    .map(ex => ({ ex, tier: tier(ex) }))
    .sort((x, y) => x.tier - y.tier || ratingOn(y.ex, muscle) - ratingOn(x.ex, muscle) || Number(best(y.ex)) - Number(best(x.ex)))
}
