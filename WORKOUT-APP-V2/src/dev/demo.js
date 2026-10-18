// Fake data for trying the app on the local dev site only: open it with
// ?demo to fill it with 12 full weeks (and this one) of made-up workouts, cardio, stretching and
// rest, or ?restore to put back what was there before. Never part of the
// live app (main.jsx only loads this in development).
import { GYM_ORDER, STRETCH_ROUTINE, COOL_DOWNS } from '../data/workout'
import { exercisesOf, settingsOf, stretchesOf, weekSetsOf, fileSession } from '../store/state'
import { clearWeek } from '../store/weeks'
import { STORAGE_KEY } from '../store/persist'
import { weekDays } from '../utils/days'

const BEFORE = `${STORAGE_KEY}-before-demo`

// The same "random" numbers every time, so the demo looks the same.
let seed = 7
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const pick = list => list[Math.floor(rand() * list.length)]

// A time on day `d` (0 = Sunday) of the week starting `sunday`.
function at(sunday, d, hour) {
  const t = new Date(sunday)
  t.setDate(t.getDate() + d)
  t.setHours(hour, Math.floor(rand() * 50), 0, 0)
  return t.toISOString()
}

// One week's activity. `k` counts up to this week (12); later weeks lift a
// bit more. `skip` is a plan left out that week; `upTo` stops at a weekday,
// for this week so far.
function weekOf(s, sunday, k, { skip = [], upTo = 6, repeat = false } = {}) {
  const checks = {}
  const cardio = []
  const classLog = []
  const restLog = []
  const stretchLog = []
  const days = [1, 2, 3, 4, 5, 6, 0].filter(d => d <= upTo)
  const plans = GYM_ORDER.filter(id => !skip.includes(id))
  plans.forEach((id, n) => {
    const day = days[n * 2 % days.length]
    if (day === undefined) return
    const when = at(sunday, day, 7 + (n % 2) * 10)
    // Every set ticked, except now and then the last set of one exercise.
    const exercises = Object.fromEntries(exercisesOf(s, id).map((ex, i) => {
      const sets = weekSetsOf(s, id, ex).length
      return [ex.id, Array.from({ length: sets }, (_, j) => !(i === 2 && j === sets - 1 && rand() < 0.3))]
    }))
    const stretched = rand() < 0.7
    checks[id] = {
      exercises,
      at: when,
      ...(id === 'push' || id === 'legsQuad' ? { warmup: true, warmedAt: when } : {}),
      ...(stretched && { stretches: Object.fromEntries(stretchesOf(s, id).map(x => [x.id, true])), stretchedAt: when }),
    }
  })
  // The full-body stretch some weeks, a cool-down after a run others.
  if (rand() < 0.5 && days.includes(6)) {
    checks[STRETCH_ROUTINE.id] = { stretches: Object.fromEntries(stretchesOf(s, STRETCH_ROUTINE.id).map(x => [x.id, true])), stretchedAt: at(sunday, 6, 9) }
  }
  if (rand() < 0.6 && days.includes(3)) {
    const cool = COOL_DOWNS[0]
    checks[cool.id] = { stretches: Object.fromEntries(stretchesOf(s, cool.id).map(x => [x.id, true])), stretchedAt: at(sunday, 3, 19) }
  }
  // Cardio: walks most weeks, runs and rides, a sport or hike now and then.
  for (const d of days.filter(() => rand() < 0.45)) cardio.push({ kind: 'walk', minutes: pick([20, 30, 30, 45]), hard: false, at: at(sunday, d, 18) })
  if (rand() < 0.8 && days.includes(2)) cardio.push({ kind: 'other', type: 'Run', minutes: pick([20, 25, 30, 35]), hard: true, at: at(sunday, 2, 6) })
  if (rand() < 0.4 && days.includes(4)) cardio.push({ kind: 'other', type: pick(['Bike', 'Row', 'Elliptical']), minutes: pick([20, 30, 40]), hard: rand() < 0.4, at: at(sunday, 4, 12) })
  if (rand() < 0.5 && days.includes(6)) cardio.push({ kind: 'sport', type: pick(['Pickleball', 'Pickleball', 'Tennis']), minutes: pick([60, 90]), hard: false, at: at(sunday, 6, 10) })
  if (rand() < 0.25 && days.includes(0)) cardio.push({ kind: 'sport', type: 'Hike', minutes: pick([90, 120, 150]), hard: false, at: at(sunday, 0, 9) })
  // A class most weeks: cardio, upper or lower body, sometimes stretching.
  if (rand() < 0.7 && days.includes(3)) {
    classLog.push({ at: at(sunday, 3, 17), cardio: true, minutes: 45, hard: true, strength: true, areas: [pick(['upper', 'lower', 'core'])], stretch: rand() < 0.5, stretchMinutes: 15 })
  }
  // Stretching on your own, and a rest day.
  if (rand() < 0.5 && days.includes(5)) stretchLog.push({ at: at(sunday, 5, 21), minutes: pick([10, 15, 20, 30]) })
  // The rest day goes on a day with nothing else.
  const busy = new Set([...Object.values(checks).flatMap(c => [c.at, c.stretchedAt]), ...cardio.map(x => x.at), ...classLog.map(x => x.at), ...stretchLog.map(x => x.at)]
    .filter(Boolean).map(t => new Date(t).getDay()))
  const free = days.find(d => !busy.has(d))
  if (free !== undefined) restLog.push(at(sunday, free, 12))

  // Weights creep up week to week.
  const exerciseSettings = { ...s.exerciseSettings }
  for (const id of GYM_ORDER) {
    for (const ex of exercisesOf(s, id)) {
      const base = settingsOf({}, ex)
      if (base.weight > 0) exerciseSettings[ex.id] = { ...base, weight: Math.round((base.weight * (0.8 + 0.2 * (k / 12))) / 5) * 5 }
    }
  }
  const week = {
    ...s,
    exerciseSettings,
    warmups: { push: { on: true, sets: [{ minutes: 5, hard: false }, { minutes: 5, hard: true }] }, legsQuad: { on: true, sets: [{ minutes: 8, hard: false }] } },
    lastResetAt: sunday.toISOString(),
    checks,
    activities: { walk: cardio.filter(x => x.kind === 'walk').length, class: classLog.length, rest: restLog.length },
    cardio,
    classLog,
    restLog,
    stretchLog,
    stretchExtra: stretchLog.length,
    sportNames: ['Spikeball', 'Climbing'],
    lastBackupAt: new Date().toISOString(),
    sessionLog: [],
  }
  return repeat ? repeats(week, sunday) : week
}

// One week with Full Body and the Full Body Stretch done twice each: the
// first of each filed, the second still open.
function repeats(s, sunday) {
  const done = (s, id, when) => ({
    ...s,
    checks: {
      ...s.checks,
      [id]: {
        exercises: Object.fromEntries(exercisesOf(s, id).map(ex => [ex.id, weekSetsOf(s, id, ex).map(() => true)])),
        stretches: Object.fromEntries(stretchesOf(s, id).map((x, i) => [x.id, i < 3])),
        at: when,
      },
    },
  })
  const stretch = (s, when) => ({ ...s, checks: { ...s.checks, [STRETCH_ROUTINE.id]: { stretches: Object.fromEntries(stretchesOf(s, STRETCH_ROUTINE.id).map(x => [x.id, true])), stretchedAt: when } } })
  s = fileSession(done(s, 'fullGym', at(sunday, 1, 18)), 'fullGym')
  s = done(s, 'fullHomeDb', at(sunday, 4, 7))
  s = fileSession(stretch(s, at(sunday, 2, 20)), STRETCH_ROUTINE.id)
  return stretch(s, at(sunday, 5, 20))
}

export function buildDemo(now = new Date()) {
  seed = 7
  const thisSunday = weekDays(now)[0]
  thisSunday.setHours(6, 0, 0, 0)
  let s = { history: [] }
  for (let k = 0; k < 13; k++) {
    const sunday = new Date(thisSunday)
    sunday.setDate(sunday.getDate() - (12 - k) * 7)
    const next = new Date(sunday)
    next.setDate(next.getDate() + 7)
    // Last week skips Back & Biceps, so it's up next; one quiet week too.
    const skip = k === 11 ? ['pull'] : k === 6 ? ['legsQuad', 'legsPost'] : rand() < 0.3 ? [pick(GYM_ORDER)] : []
    if (k < 12) {
      const key = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`
      s = clearWeek(weekOf(s, sunday, k, { skip, repeat: k === 11 }), next.toISOString(), key)
    } else {
      // This week so far: up to today.
      s = weekOf(s, sunday, k, { skip: ['pull', 'legsPost'], upTo: now.getDay() })
    }
  }
  return s
}

// ?demo saves what's there (once) and swaps in the demo; ?restore puts it
// back. Either way the address is cleaned up after.
export function runDemoSwitch() {
  const q = new URLSearchParams(location.search)
  if (q.has('demo')) {
    if (localStorage.getItem(BEFORE) === null) localStorage.setItem(BEFORE, localStorage.getItem(STORAGE_KEY) ?? '')
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildDemo()))
  } else if (q.has('restore')) {
    const before = localStorage.getItem(BEFORE)
    if (before !== null) {
      if (before) localStorage.setItem(STORAGE_KEY, before)
      else localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(BEFORE)
    }
  } else return
  history.replaceState(null, '', location.pathname)
}
