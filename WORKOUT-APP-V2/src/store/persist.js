import { workouts } from '../data/workout'

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
  return toSundayWeeks(next)
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
