import { PLAN_IDS } from '../data/workout'
import { weekDays } from '../utils/days'
import { setupOf, settingsOf, equipmentOf, splitOf, weekSetsOf, dayLogOf, classesOf, cardioWeekOf, sessionsOfKind, exercisesOf, weekOf, restDaysOf, ownStretchesOf, stretchWeekOf } from './state'

// Past weeks: summing up a week for history, keeping each saved week's
// details so it can be opened and edited, and filing weeks under their Sunday.

// ── A saved week's details ─────────────────────────────────────────────────
// Each saved week keeps everything you ticked and logged, and how your plans
// were set up that week (lists, weights, timers), so it can be opened and
// changed later without touching this week's numbers.
const WEEK_KEYS = ['checks', 'activities', 'stretchExtra', 'stretchLog', 'cardio', 'classLog', 'restLog']
const SETUP_KEYS = ['exerciseSettings', 'setup', 'warmups', 'order', 'coreLists', 'coreOn', 'stretchLists', 'equipment', 'assist', 'customDurations', 'perSide', 'stretchSets', 'stretchRest']
const EMPTY_WEEK = { checks: {}, activities: {}, stretchExtra: 0, stretchLog: [], cardio: [], classLog: [], restLog: [] }

export function detailsOf(s) {
  return Object.fromEntries([...WEEK_KEYS, ...SETUP_KEYS].filter(k => s[k] !== undefined).map(k => [k, s[k]]))
}

// A saved week laid over the app's state, so the usual helpers read it. Its
// clock is the week's Sunday: anything added without a day lands there.
export function weekStateOf(s, entry) {
  const sunday = weekDays(new Date(`${calendarWeekOf(entry)}T12:00:00`))[6]
  const setup = Object.fromEntries(SETUP_KEYS.map(k => [k, undefined]))
  return { ...s, ...EMPTY_WEEK, ...setup, ...entry.details, lastResetAt: entry.start, clockAt: sunday.toISOString() }
}

// Runs a change on a saved week and files the result back in its place,
// with its numbers worked out again (Trends reads those).
export function writeWeek(s, weekStart, fn) {
  const history = s.history ?? []
  const i = history.findIndex(e => calendarWeekOf(e) === weekStart)
  if (i < 0 || !history[i].details) return s
  const before = weekStateOf(s, history[i])
  const after = fn(before)
  if (after === before) return s
  const entry = { ...summarize(after, history[i].end), start: history[i].start, weekStart }
  return { ...s, history: history.map((e, j) => (j === i ? entry : e)) }
}

// Every week to swipe through, oldest first, ending with this one:
// { weekStart, dayLog } — dayLog is null for weeks saved before days were.
export function weeksOf(s) {
  const saved = [...(s.history ?? [])].reverse().map(e => ({
    weekStart: calendarWeekOf(e),
    dayLog: e.details ? dayLogOf(weekStateOf(s, e)) : null,
  }))
  return [...saved, { weekStart: weekKeyOf(new Date()), dayLog: dayLogOf(s), live: true }]
}

// Two saves in the same calendar week as one: ticks from either, everything
// logged in both, and the later plan setup.
function mergeDetails(a, b) {
  const sa = { ...EMPTY_WEEK, ...a }
  const sb = { ...EMPTY_WEEK, ...b }
  const checks = { ...sa.checks }
  for (const [id, c] of Object.entries(sb.checks)) {
    const p = checks[id] ?? {}
    const exercises = { ...p.exercises }
    for (const [ex, t] of Object.entries(c.exercises ?? {})) exercises[ex] = t.map((x, i) => x || !!p.exercises?.[ex]?.[i])
    const stretches = { ...p.stretches }
    for (const [st, on] of Object.entries(c.stretches ?? {})) stretches[st] = on || !!stretches[st]
    checks[id] = { ...p, ...c, exercises, stretches, warmup: !!(p.warmup || c.warmup), at: p.at ?? c.at, stretchedAt: p.stretchedAt ?? c.stretchedAt }
  }
  const walksOf = x => sessionsOfKind(x, 'walk')
  const otherOf = x => (x.cardio ?? []).filter(y => y.kind !== 'walk')
  const classes = [...classesOf(sa), ...classesOf(sb)]
  const walks = [...walksOf(sa), ...walksOf(sb)]
  const rest = [...restDaysOf(sa), ...restDaysOf(sb)]
  const own = [...ownStretchesOf(sa), ...ownStretchesOf(sb)]
  return {
    ...a,
    ...Object.fromEntries(SETUP_KEYS.filter(k => b[k] !== undefined).map(k => [k, b[k]])),
    checks,
    activities: { ...sa.activities, ...sb.activities, class: classes.length, walk: walks.length, rest: rest.length },
    classLog: classes,
    cardio: [...otherOf(sa), ...otherOf(sb), ...walks],
    restLog: rest,
    stretchLog: own,
    stretchExtra: own.length,
  }
}

// Files the week so far under Past weeks and starts an empty one. Your
// numbers and settings are left alone. A second save in the same calendar
// week adds to that week's entry.
export function clearWeek(s, now, weekStart) {
  const summary = summarize(s, now)
  const entry = weekStart ? { ...summary, weekStart } : summary
  const [latest, ...older] = s.history ?? []
  const history = latest && calendarWeekOf(latest) === entry.weekStart
    ? [joinWeeks(s, { ...latest, weekStart: entry.weekStart }, entry), ...older]
    : [entry, ...(s.history ?? [])]
  return {
    ...s,
    history,
    lastResetAt: now,
    checks: {},
    activities: {},
    cardio: [],
    classLog: [],
    stretchExtra: 0,
    stretchLog: [],
    restLog: [],
  }
}

// The week resets itself: the first time the app runs in a new calendar week
// (Sunday–Saturday), the last week is filed under the week it started in and a
// note says so. A first run just starts the clock.
export function rollWeek(s, date = new Date()) {
  if (!s.lastResetAt) return { ...s, lastResetAt: date.toISOString() }
  const thisWeek = weekKeyOf(date)
  if (weekKeyOf(s.lastResetAt) === thisWeek) return s
  const weekStart = weekKeyOf(s.lastResetAt)
  const sunday = new Date(`${thisWeek}T00:00:00`).toISOString()
  return { ...clearWeek(s, sunday, weekStart), newWeek: { weekStart } }
}

// ── Calendar weeks for history ─────────────────────────────────────────────
// Past weeks are filed by calendar week (Sunday–Saturday, as "YYYY-MM-DD" of
// the Sunday). A saved period belongs to the week its middle falls in, so a
// reset on Saturday night or Sunday morning both file the week just finished;
// with no earlier reset, the day before the reset stands in for the middle.
export function weekKeyOf(date) {
  const d = new Date(date)
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function calendarWeekOf(entry) {
  if (entry.weekStart) return entry.weekStart
  const end = new Date(entry.end).getTime()
  const anchor = entry.start ? (new Date(entry.start).getTime() + end) / 2 : end - 86400000
  return weekKeyOf(anchor)
}

// Two saved periods in the same calendar week become one entry. With both
// periods' details it's worked out again from them; otherwise the numbers
// are added up and the week can't be opened.
function joinWeeks(s, a, b) {
  if (!a.details || !b.details) return mergeWeeks(a, b)
  const joined = { start: a.start, end: b.end, weekStart: a.weekStart, details: mergeDetails(a.details, b.details) }
  return { ...summarize(weekStateOf(s, joined), b.end), start: a.start, weekStart: a.weekStart }
}

// Two saved periods in the same calendar week become one entry.
function mergeWeeks(a, b) {
  const sum = (x, y) => Object.fromEntries(Object.keys({ ...x, ...y }).map(k => [k, (x[k] ?? 0) + (y[k] ?? 0)]))
  return {
    weekStart: a.weekStart,
    start: a.start ?? b.start,
    end: b.end,
    week: sum(a.week, b.week),
    stretch: sum(a.stretch, b.stretch),
    ...(a.cardio || b.cardio ? { cardio: sum(a.cardio ?? {}, b.cardio ?? {}) } : {}),
    plans: b.plans.map(p => {
      const q = a.plans.find(x => x.id === p.id)
      return { ...p, done: Math.min(p.total, p.done + (q?.done ?? 0)) }
    }),
    lifted: a.lifted + b.lifted,
    lifts: { ...a.lifts, ...b.lifts },
    ...(a.classes || b.classes ? { classes: [...(a.classes ?? []), ...(b.classes ?? [])] } : {}),
  }
}

// ── Persistence ────────────────────────────────────────────────────────────

// A week as saved in history: the same numbers as the live cards, plus how
// far each plan got, pounds lifted (reps × weight on ticked rep sets), and
// what you ticked on each exercise — the raw material for Trends.
export function summarize(s, endedAt) {
  let lifted = 0
  const lifts = {}
  const plans = PLAN_IDS.map(id => {
    let done = 0
    let total = 0
    for (const ex of exercisesOf(s, id)) {
      const all = weekSetsOf(s, id, ex)
      const ticked = all.filter(x => x.done)
      total += all.length
      done += ticked.length
      // Every exercise you ticked a set of: its mode, weight, the reps (or hold
      // seconds) of the ticked sets, and whether it was assisted — what the
      // Trends charts draw from. Split cards' ticked sets go under `splits`.
      if (ticked.length) {
        const mode = setupOf(s, ex).mode
        if (mode === 'reps') lifted += ticked.reduce((n, x) => n + x.reps * x.weight, 0)
        const splits = (splitOf(s, id, ex)?.parts ?? [])
          .map((p, j) => ({ weight: p.weight, sets: ticked.filter(x => x.part === j).map(x => x.reps) }))
          .filter(x => x.sets.length)
        lifts[ex.id] = {
          mode,
          weight: settingsOf(s, ex).weight,
          sets: ticked.filter(x => x.part < 0).map(x => x.reps),
          assist: equipmentOf(s, ex) === 'assisted',
          ...(splits.length > 0 && { splits }),
        }
      }
    }
    return { id, done, total }
  })
  const entry = {
    start: s.lastResetAt ?? null,
    end: endedAt,
    details: detailsOf(s),
    week: weekOf(s),
    stretch: stretchWeekOf(s),
    cardio: cardioWeekOf(s),
    classes: classesOf(s),
    plans,
    lifted: Math.round(lifted),
    lifts,
  }
  return { ...entry, weekStart: calendarWeekOf(entry) }
}
