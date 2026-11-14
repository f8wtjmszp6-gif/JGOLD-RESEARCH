import { workouts, FULL_BODY, GYM_ORDER, STRETCH_ROUTINE, COOL_DOWNS } from '../data/workout'
import { EXERCISE_BY_ID, DEFAULT_CORE } from '../data/exercises'

// Loading and saving the app's state on this device, and bringing older saves
// up to date.
export const STORAGE_KEY = 'workout-tracker-v2'

// Earlier builds stored the plank's seconds under `reps`; they're holds now.
export function migrate(s) {
  let settings = s.exerciseSettings
  for (const w of Object.values(workouts)) {
    for (const ex of w.exercises) {
      const saved = settings?.[ex.id]
      if (ex.isTime && saved?.reps && !saved.holds) {
        const { reps, ...rest } = saved
        settings = { ...settings, [ex.id]: { ...rest, holds: reps } }
      }
    }
  }
  const next = settings === s.exerciseSettings ? s : { ...s, exerciseSettings: settings }
  return freshCoolDowns(freshFullBodyPlans(freshStretches(mergeFullBodyCore(mergeCore(freshFullBody(toSundayWeeks(next)))))))
}

// The four gym plans used to keep core in a Core section of its own (on or
// off); now it's part of the main list. Once, each plan's saved lists (every
// week's, this week's own, and each past week's) become one list: the main
// list, then Core if it was on.
const OLD_CORE = { push: [], legsQuad: ['plank', 'dead-bugs', 'side-plank'], pull: ['hanging-leg-raises', 'pallof-press'], legsPost: ['woodchoppers', 'ab-wheel'] }
const OLD_CORE_ON = { push: false, legsQuad: true, pull: true, legsPost: true }
const OLD_KEYS = ['order', 'coreLists', 'coreOn']
function mergeCore(s) {
  return s.coreMerged ? s : mergeCoreOf(s, GYM_ORDER, OLD_CORE, OLD_CORE_ON, 'coreMerged')
}

// The full-body days did the same later: their Core section (on unless
// switched off) joins the end of the main list, once.
function mergeFullBodyCore(s) {
  return s.fullBodyCoreMerged ? s : mergeCoreOf(s, FULL_BODY.map(p => p.id), DEFAULT_CORE, Object.fromEntries(FULL_BODY.map(p => [p.id, true])), 'fullBodyCoreMerged')
}

function mergeCoreOf(s, plans, OLD_CORE, OLD_CORE_ON, flag) {
  const groupOf = id => EXERCISE_BY_ID[id]?.group ?? s.customExercises?.find(c => c.id === id)?.group
  const isCore = id => groupOf(id) === 'core'
  // One plan's merged list, read from `get(key)` as the app used to.
  const merged = (id, get) => {
    const order = get('order')
    const main = (order ?? workouts[id].exercises.map(e => e.id)).filter(x => !isCore(x))
    const core = get('coreLists') ?? (order?.some(isCore) ? order.filter(isCore) : OLD_CORE[id])
    const on = get('coreOn') ?? OLD_CORE_ON[id]
    return [...main, ...(on ? core.filter(isCore) : [])]
  }
  const without = (map, id) => (map ? Object.fromEntries(Object.entries(map).filter(([x]) => x !== id)) : map)
  // A saved state (or a past week's): every week's lists, then this week's own.
  const level = x => {
    let next = { ...x }
    for (const id of plans) {
      const own = OLD_KEYS.some(k => x.weekOnly?.[k]?.[id] !== undefined)
      // With a week of its own, every week's is kept as it was too, so the
      // new starting lists don't show up as taken out this week.
      if (own || OLD_KEYS.some(k => x[k]?.[id] !== undefined)) {
        next.order = { ...next.order, [id]: merged(id, k => x[k]?.[id]) }
      }
      if (own) {
        const week = merged(id, k => x.weekOnly?.[k]?.[id] ?? x[k]?.[id])
        next.weekOnly = { ...next.weekOnly, order: { ...next.weekOnly.order, [id]: week } }
        next.weekOnly.coreLists = without(next.weekOnly.coreLists, id)
        next.weekOnly.coreOn = without(next.weekOnly.coreOn, id)
      }
      next.coreLists = without(next.coreLists, id)
      next.coreOn = without(next.coreOn, id)
    }
    return next
  }
  return {
    ...level(s),
    [flag]: true,
    ...(s.history && { history: s.history.map(e => (e.details ? { ...e, details: level(e.details) } : e)) }),
  }
}

// The gym and Full Body plans' starting stretches changed to cover what
// each plan now works (one stretch per muscle, or per muscle group for Full
// Body), the Full Body Stretch's to cover every muscle, and each
// cool-down's to five. Once, their saved stretch lists (every week's and this week's own)
// go, so they start from the new ones.
function freshStretches(s) {
  if (s.stretchDefaults8) return s
  const plans = [...GYM_ORDER, ...FULL_BODY.map(p => p.id), STRETCH_ROUTINE.id, ...COOL_DOWNS.map(c => c.id)]
  const drop = map => (map ? Object.fromEntries(Object.entries(map).filter(([id]) => !plans.includes(id))) : map)
  return {
    ...s,
    stretchDefaults8: true,
    ...(s.stretchLists && { stretchLists: drop(s.stretchLists) }),
    ...(s.weekOnly?.stretchLists && { weekOnly: { ...s.weekOnly, stretchLists: drop(s.weekOnly.stretchLists) } }),
  }
}

// The Run cool-down's stretches changed. Once, a saved list for it goes,
// so it starts from the new one.
function freshCoolDowns(s) {
  if (s.coolDownDefaults2) return s
  const drop = map => (map ? Object.fromEntries(Object.entries(map).filter(([id]) => id !== 'coolRun')) : map)
  return {
    ...s,
    coolDownDefaults2: true,
    ...(s.stretchLists && { stretchLists: drop(s.stretchLists) }),
    ...(s.weekOnly?.stretchLists && { weekOnly: { ...s.weekOnly, stretchLists: drop(s.weekOnly.stretchLists) } }),
  }
}

// The full-body days' starting exercises changed (12 that work all 17
// muscles). Once, their saved exercise lists go, so they start from those.
function freshFullBodyPlans(s) {
  if (s.fullBodyDefaults2) return s
  const ids = FULL_BODY.map(p => p.id)
  const drop = map => (map ? Object.fromEntries(Object.entries(map).filter(([id]) => !ids.includes(id))) : map)
  const next = { ...s, fullBodyDefaults2: true }
  for (const key of ['order', 'coreLists', 'coreOn']) {
    if (s[key]) next[key] = drop(s[key])
    if (s.weekOnly?.[key]) next.weekOnly = { ...next.weekOnly, [key]: drop(s.weekOnly[key]) }
  }
  return next
}

// Full-body days used to keep no lists of their own; any left over from
// then go, once, so they start from their new defaults (and from now on
// keep what you change for every time).
function freshFullBody(s) {
  if (s.fullBodyLists) return s
  const next = { ...s, fullBodyLists: true }
  for (const key of ['order', 'coreLists', 'coreOn', 'stretchLists']) {
    if (!s[key]) continue
    next[key] = Object.fromEntries(Object.entries(s[key]).filter(([id]) => !FULL_BODY.some(p => p.id === id)))
  }
  return next
}

// Weeks used to run Monday to Sunday and were filed under their Monday; now
// they start on Sunday. A week filed under a Monday moves to the Sunday
// before, so Trends and swiping line up with the new weeks.
function toSundayWeeks(s) {
  const sunday = key => {
    const [y, m, d] = key.split('-').map(Number)
    const day = new Date(y, m - 1, d, 12)
    if (day.getDay() !== 1) return key
    day.setDate(day.getDate() - 1)
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
  }
  if (!s.history?.some(e => e.weekStart && e.weekStart !== sunday(e.weekStart)) && !s.newWeek) return s
  return {
    ...s,
    ...(s.history && { history: s.history.map(e => (e.weekStart ? { ...e, weekStart: sunday(e.weekStart) } : e)) }),
    ...(s.newWeek && { newWeek: { weekStart: sunday(s.newWeek.weekStart) } }),
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? migrate(JSON.parse(raw)) : {}
  } catch {
    return {}
  }
}

export function saveState(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    // Storage may be unavailable (private mode / quota) — nothing to do.
  }
}
