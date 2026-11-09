import { workouts, GYM_ORDER, FULL_BODY, STRETCH_ROUTINE, COOL_DOWNS } from '../data/workout'
import { EXERCISE_BY_ID } from '../data/exercises'
import { STRETCH_BY_ID } from '../data/stretches'

// The defaults in Settings, by group: [title, [[id, name]]]. Build a
// Workout has none: each one is made fresh from what you pick.
export const GROUPS = [
  ['Workout plans', GYM_ORDER.map(id => [id, workouts[id].short])],
  ['Full Body', FULL_BODY.map(p => [p.id, p.label])],
  ['Stretching', [[STRETCH_ROUTINE.id, STRETCH_ROUTINE.short], ...COOL_DOWNS.map(c => [c.id, c.name])]],
]
export const IDS = GROUPS.flatMap(([, rows]) => rows.map(([id]) => id))
export const nameOf = id => EXERCISE_BY_ID[id]?.name ?? STRETCH_BY_ID[id]?.name ?? id

// For the section's closed row.
export function defaultsSummary(store) {
  const n = IDS.filter(id => store.defaultEdits(id).edited).length
  return { text: n ? `${n} edited` : 'All default' }
}
