import { calendarWeekOf } from '../store/weeks'
import { weekDays, weekRange } from './days'
import { backupAge } from './backup'
import { metric } from './lifts'
import { EXERCISE_BY_ID } from '../data/exercises'
import { workouts } from '../data/workout'
import { upNextOf } from './upNext'
import { weightWeek, goalsOf, lastWeight, lastWeighDay } from './nutrition'
import { suggestedTargets, earliestDate } from './targets'

const fmt = n => (Number.isInteger(n) ? String(n) : n.toFixed(1))
const TARGET_KEYS = ['cal', 'protein', 'fat', 'carbs', 'fiber', 'sugar', 'water']
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
// Trends charts it. Only lifts done with weight, which Trends lists; not
// assisted, timed or reps-only ones.
function newBests(store) {
  const out = []
  for (const [id, lift] of Object.entries(store.current.lifts ?? {})) {
    const m = metric(lift)
    if (m?.unit !== 'lb' || m.assist) continue
    const before = store.history.map(e => metric(e.lifts?.[id])).filter(x => x && x.unit === m.unit)
    if (!before.length) continue
    const best = before.reduce((b, x) => ((x.v - b) * m.better > 0 ? x.v : b), before[0].v)
    if ((m.v - best) * m.better > 0) out.push({ id, m, best })
  }
  return out
}

// "Averaged 182.4 lb, down 0.8 lb from the week before."
export function weightTrendText(change, avg) {
  const c = Math.round(change * 10) / 10
  const moved = c === 0 ? 'the same as the week before' : `${c < 0 ? 'down' : 'up'} ${fmt(Math.abs(c))} lb from the week before`
  return `Averaged ${avg.toFixed(1)} lb, ${moved}.`
}

const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// A backup is due when there's never been one, or the last is a week old.
function backupDue(lastBackupAt) {
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
      lift: id,
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
      body: `Last week, ${weekRange(dayKey(lastSunday))}: ${t.text}. ${t.met} of ${t.of} goals met.`,
      action: 'View last week',
      run: 'week',
      weekStart: dayKey(lastSunday),
    })
  }
  // The plan last week missed, until you start your first plan of the week.
  // After that the Up next label on Today is enough; without this, finishing
  // one missed plan would bring up the next missed one.
  const next = upNextOf(store, now)
  const startedThisWeek = (store.current.plans ?? []).some(p => p.done > 0)
  if (next?.missed && !startedThisWeek) {
    const name = workouts[next.id].short
    notes.push({
      id: `next:${week}:${next.id}`,
      icon: 'next',
      title: `Start with ${name}`,
      body: `${next.reason === 'Skipped last week' ? 'Missed' : 'Unfinished'} last week. Pick up where you left off.`,
      action: `Open ${name}`,
      run: 'plan',
      plan: next.id,
    })
  }
  // Weigh in: once you've weighed in before, each day you haven't yet.
  const n = store.nutrition
  const today = dayKey(now)
  if (Object.keys(n?.weights ?? {}).length && n.weights[today] == null) {
    notes.push({
      id: `weigh:${today}`,
      icon: 'weight',
      title: 'Weigh in',
      body: 'You haven’t weighed in today.',
      action: 'Weigh in',
      run: 'weigh',
    })
  }
  // New suggested targets (only when a row in Targets shows Use): back again whenever the
  // suggestions change, so keeping your own numbers doesn't nag.
  const goals = goalsOf(n)
  const suggested = suggestedTargets(goals, lastWeight(n), store.profile)
  const off = TARGET_KEYS.filter(k => suggested[k] != null && suggested[k] !== goals[k])
  if (off.length) {
    notes.push({
      id: `targets:${off.map(k => `${k}=${suggested[k]}`).join(',')}`,
      icon: 'targets',
      title: 'Review your targets',
      action: 'Review',
      run: 'targets',
    })
  }
  // Your target date's now sooner than your fastest safe pace can get you
  // there (behind, or a new weigh-in or activity): pick a later one. Once
  // per date, so clearing it doesn't nag.
  const p = store.profile ?? {}
  const earliest = p.targetDate ? earliestDate(p, lastWeight(n), lastWeighDay(n)) : null
  if (earliest && p.targetDate < earliest) {
    const [y, m, d] = earliest.split('-').map(Number)
    const when = new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    notes.push({
      id: `date:${p.targetDate}`,
      icon: 'date',
      title: 'Your target date is too soon',
      body: `At your fastest safe pace you'll reach ${p.targetLb} lb around ${when}.`,
      action: 'Change date',
      run: 'targets',
    })
  }
  // Last week's average weight against the week before.
  const lastAvg = weightWeek(n, weekDays(lastSunday)).avg
  const beforeSunday = new Date(lastSunday)
  beforeSunday.setDate(lastSunday.getDate() - 7)
  const beforeAvg = weightWeek(n, weekDays(beforeSunday)).avg
  if (lastAvg != null && beforeAvg != null) {
    notes.push({
      id: `trend:${dayKey(lastSunday)}`,
      icon: 'weight',
      title: 'Your weight last week',
      body: weightTrendText(lastAvg - beforeAvg, lastAvg),
    })
  }
  if (backupDue(store.lastBackupAt)) {
    const age = backupAge(store.lastBackupAt, now)
    notes.push({
      id: `backup:${dayKey(thisSunday)}`,
      icon: 'backup',
      title: 'Time to back up',
      body: age ? `Your last backup was ${age}.` : 'You haven’t backed up yet.',
      action: 'Back up',
      run: 'backup',
    })
  }
  return notes.filter(Boolean)
}
