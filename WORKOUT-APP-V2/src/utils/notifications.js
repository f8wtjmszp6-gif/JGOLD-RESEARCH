import { calendarWeekOf } from '../hooks/useStore'
import { weekDays, weekRange } from './days'
import { backupAge } from './backup'
import { metric } from './lifts'
import { EXERCISE_BY_ID } from '../data/exercises'

const fmt = n => (Number.isInteger(n) ? String(n) : n.toFixed(1))
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

// A week's totals against your goals: "3 workouts, 2 stretches, 180 cardio
// min", and how many of the three goals reached their minimum.
function weekTotals(entry, goals) {
  const w = entry.week
  const workouts = w.gym + w.class + (w.cardio ?? 0) + (w.stretchWork ?? 0)
  const stretches = entry.stretch.total
  const cardio = entry.cardio?.total ?? null
  const met = [workouts >= goals.workouts.min, stretches >= goals.stretch.min, cardio !== null && cardio >= goals.cardio.min].filter(Boolean).length
  const parts = [plural(workouts, 'workout', 'workouts'), plural(stretches, 'stretch', 'stretches'), cardio !== null && `${cardio} cardio min`].filter(Boolean)
  return { text: parts.join(', '), met, all: met === (cardio === null ? 2 : 3), of: cardio === null ? 2 : 3 }
}

// This week's new bests: each lift that beats every earlier week, the way
// Trends charts it (more weight, less help when assisted, a longer hold, or
// more reps on bodyweight moves).
function newBests(store) {
  const out = []
  for (const [id, lift] of Object.entries(store.current.lifts ?? {})) {
    const m = metric(lift)
    if (!m) continue
    const before = store.history.map(e => metric(e.lifts?.[id])).filter(x => x && x.unit === m.unit)
    if (!before.length) continue
    const best = before.reduce((b, x) => ((x.v - b) * m.better > 0 ? x.v : b), before[0].v)
    if ((m.v - best) * m.better > 0) out.push({ id, m, best })
  }
  return out
}

const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// A backup is due when there's never been one, or the last is a week old.
export function backupDue(lastBackupAt) {
  return !lastBackupAt || Date.now() - new Date(lastBackupAt).getTime() > 7 * 86400000
}

// Everything the app has to tell you right now, newest first. Each has an id
// that changes when it's news again (the backup reminder comes back each week
// it's still due), so the bell knows what you haven't seen.
export function notificationsOf(store, now = new Date()) {
  const thisSunday = weekDays(now)[0]
  const lastSunday = new Date(thisSunday)
  lastSunday.setDate(thisSunday.getDate() - 7)
  const notes = []
  const week = dayKey(thisSunday)
  // Every goal met this week.
  const thisWeek = weekTotals(store.current, store.goals)
  if (thisWeek.all) {
    notes.push({
      id: `goals:${week}`,
      icon: 'goals',
      title: 'All goals met this week ✓',
      body: `${thisWeek.text}. Nice work.`,
    })
  }
  // A new best on a lift. The value is in the id, so beating it again later
  // in the week is news again.
  for (const { id, m, best } of newBests(store)) {
    const unit = m.unit === 's' ? 's' : ` ${m.unit}`
    const name = EXERCISE_BY_ID[id]?.name ?? id
    notes.push({
      id: `pr:${week}:${id}:${m.v}`,
      icon: 'pr',
      title: `New best: ${name}`,
      body: `${fmt(m.v)}${unit}${m.assist ? ' of help' : ''}, ${m.better > 0 ? 'up' : 'down'} from your best of ${fmt(best)}${unit}.`,
      action: 'See in Trends',
      run: 'trends',
    })
  }
  // Last week, once it's been saved, with how it went: swipe back to see or
  // fix it.
  const last = store.history.find(e => calendarWeekOf(e) === dayKey(lastSunday))
  if (last) {
    const t = weekTotals(last, store.goals)
    notes.push({
      id: `week:${dayKey(lastSunday)}`,
      icon: 'week',
      title: 'New week started',
      body: `Last week, ${weekRange(dayKey(lastSunday))}: ${t.text}. ${t.met} of ${t.of} goals met. Swipe back on the days to see it or make changes.`,
      action: 'View last week',
      run: 'week',
      weekStart: dayKey(lastSunday),
    })
  }
  if (backupDue(store.lastBackupAt)) {
    const age = backupAge(store.lastBackupAt, now)
    notes.push({
      id: `backup:${dayKey(thisSunday)}`,
      icon: 'backup',
      title: 'Time to back up',
      body: age ? `Your last backup was ${age}. A backup keeps your weeks safe if the app is ever removed.` : 'You haven’t backed up yet. A backup keeps your weeks safe if the app is ever removed.',
      action: 'Back up',
      run: 'backup',
    })
  }
  return notes
}
