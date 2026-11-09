import { MUSCLE_LABEL } from '../data/targeted'

// The muscles in each group, for Targets.
export const MUSCLES = {
  chest: ['chest'],
  back: ['lats', 'traps', 'lower-back'],
  shoulders: ['front-delts', 'side-delts', 'rear-delts'],
  arms: ['biceps', 'triceps'],
  legs: ['quads', 'inner-thighs', 'glutes', 'outer-thighs', 'hamstrings', 'calves'],
  core: ['abs', 'obliques'],
}
export const ALL_MUSCLES = Object.values(MUSCLES).flat()
export const muscleName = m => MUSCLE_LABEL[m] ?? m.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase())
// A web search, for the ⓘ links.
export const google = q => `https://www.google.com/search?q=${encodeURIComponent(q)}`
