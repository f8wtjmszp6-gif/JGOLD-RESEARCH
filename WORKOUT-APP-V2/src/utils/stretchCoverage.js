import { pairUp, primaryOf } from '../data/exercises'
import { FULL_BODY_BY_ID, MUSCLE_GROUPS, STRETCH_ROUTINE, workouts } from '../data/workout'
import { MUSCLE_LABEL } from '../data/targeted'
import { MUSCLES } from './muscles'

const groupOf = m => MUSCLE_GROUPS.find(g => MUSCLES[g.id].includes(m))?.id

// What a list's stretches should cover: each muscle its main exercises
// mainly work, one stretch each (paired as exercises are). A Full Body plan
// works too many muscles for that, so it goes by muscle group. The Full
// Body Stretch goes by every muscle. None for a cool-down. Each area: { id, label, covered, by, reaches(x) }.
export function stretchAreas(store, listId, list) {
  // The Full Body Stretch has no exercises: it should reach every muscle.
  const routine = listId === STRETCH_ROUTINE.id
  if (!routine && !workouts[listId]?.exercises) return []
  const trained = new Set(routine ? Object.values(MUSCLES).flat() : store.getExerciseSections(listId).main.flatMap(x => primaryOf(x)))
  const byGroup = !!FULL_BODY_BY_ID[listId]
  const ids = byGroup
    ? MUSCLE_GROUPS.map(g => g.id).filter(g => [...trained].some(m => groupOf(m) === g))
    : Object.keys(MUSCLE_LABEL).filter(m => trained.has(m))
  const reaches = byGroup ? x => (x.muscles ?? []).map(groupOf) : x => x.muscles ?? []
  const holder = pairUp(list, ids, reaches)
  return ids.map(id => ({
    id,
    label: byGroup ? MUSCLE_GROUPS.find(g => g.id === id).label : MUSCLE_LABEL[id],
    covered: holder[id] !== undefined,
    by: list[holder[id]] ?? null,
    // Its rating for this area: rank 1 is 3, rank 2 is 2, rank 3 is 1.
    rate: x => { const i = reaches(x).indexOf(id); return i < 0 ? 0 : 3 - i },
  }))
}
