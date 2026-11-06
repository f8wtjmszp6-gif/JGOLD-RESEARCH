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

// Fewer areas get more exercises each, so it's a full session either way.
export const perArea = n => (n === 1 ? 4 : n === 2 ? 3 : n <= 4 ? 2 : 1)
export const stretchesPerArea = n => (n <= 2 ? 2 : 1)

// "Chest & Glutes", "Chest, Back & Arms", "Chest, Back & 2 more".
export function targetName(areas) {
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
// back, so doing the same areas again mixes it up.
export function buildTargeted(areas, eq, { known = new Set(), recent = new Set() } = {}) {
  const picked = TARGET_AREAS.filter(a => areas.includes(a.id))
  const n = perArea(picked.length)
  const used = new Set()
  const main = []
  const core = []
  for (const area of picked) {
    const pool = EXERCISE_BANK.filter(ex =>
      (area.id === 'core') === isCore(ex) && fitsEquipment(ex, eq) && coversOf(ex).some(t => area.tags.includes(t)))
    for (let i = 0; i < n; i++) {
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
    }
  }
  const s = stretchesPerArea(picked.length)
  const stretches = []
  for (const area of picked) {
    const list = area.stretches.filter(id => STRETCH_BY_ID[id] && !stretches.includes(id))
    const fresh = [...list.filter(id => !recent.has(id)), ...list.filter(id => recent.has(id))]
    stretches.push(...fresh.slice(0, s))
  }
  return { main, core, stretches }
}
