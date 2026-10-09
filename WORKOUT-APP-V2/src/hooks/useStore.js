import { useCallback, useState } from 'react'
import { workouts, activities, GYM_ORDER, STRETCH_ROUTINE, COMPOUND_LIFTS, REST_COMPOUND, REST_ACCESSORY, CARDIO_DEFAULTS, cardioIsWorkout, classIsWorkout, STRETCH_WORKOUT_MINUTES, CLASS_DEFAULT, CLASS_LEGACY } from '../data/workout'

import { STRETCH_BY_ID, defaultStretchIds, stretchFits } from '../data/stretches'
import { EXERCISE_BY_ID, fitsPlan, isCore, CORE_ON_BY_DEFAULT, DEFAULT_CORE, defaultEquipment } from '../data/exercises'

const STORAGE_KEY = 'workout-tracker-v2'

// State is split into what you've set and what you've done:
//
//   Remembered — never cleared:
//     exerciseSettings  { [exerciseId]: { bar, weight, reps: [n, …], holds: [seconds, …] } }
//     setup             { [exerciseId]: { mode: 'reps' | 'hold', perSide, restOn, rest } }
//     warmups           { [workoutId]: { on, minutes } }
//     order             { [workoutId]: [exerciseId, …] }  (a plan's exercises, in order, from the bank)
//     coreLists         { [workoutId]: [exerciseId, …] }  (its Core section)
//     coreOn            { [workoutId]: bool }              (whether the Core section is on)
//     stretchLists      { [workoutId | 'routine']: [stretchId, …] }  (your stretches, from the bank)
//     equipment         { [exerciseId]: 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'assisted' }
//     assist            { [exerciseId]: bool }  (kept in step with equipment; older saves only have this)
//     customDurations   { [stretchId]: seconds }
//     perSide           { [stretchId]: bool }
//     stretchSets       { [stretchId]: count }  (rounds of a stretch, default 1)
//     stretchRest       { [stretchId]: seconds } (rest between those rounds, default 20)
//     cardioSettings    { walk | other: { minutes, hard } }  (length of one session)
//     lastClass         your answers for the last class logged (its length and effort carry over)
//     lastBackupAt      ISO time of the last backup file you saved
//     history           [weekSummary, …] newest first — saved by each reset, never cleared
//     lastResetAt       ISO time of the last reset (the start of the current week)
//
//   Checkmarks — cleared by the header reset:
//     checks            { [workoutId]: { exercises: { [id]: [bool, …] }, stretches: { [id]: bool }, warmup: bool } }
//     activities        { class | walk | rest: count }
//     stretchExtra      count of stretch sessions done on your own
//     stretchLog        [{ at, minutes }, …] — how long each of those was
//     cardio            [{ kind: 'walk' | 'other', minutes, hard }, …] — one per session
//     classLog          [{ at, cardio, minutes, hard, strength, areas, stretch, stretchMinutes }, …] — one per class

function lowReps(repsStr) {
  const n = parseInt(String(repsStr).split('–')[0])
  return isNaN(n) ? 0 : n
}

// ── Pure state helpers ─────────────────────────────────────────────────────
// These take the raw state so both readers and writers (inside the setState
// updater) agree on derived values without a stale closure.

// How an exercise is set up — the same questions for every exercise:
//   mode    – sets counted in reps, or held for a number of seconds
//   perSide – done on each side (a hold's timer runs once per side)
//   restOn  – start a rest countdown after each ticked set, of `rest` seconds
//             (off until you turn it on; then it starts by itself after every set)
function setupOf(s, exercise) {
  const saved = s.setup?.[exercise.id]
  return {
    mode: saved?.mode ?? (exercise.isTime ? 'hold' : 'reps'),
    perSide: saved?.perSide ?? !!exercise.perSide,
    restOn: saved?.restOn ?? false,
    rest: saved?.rest ?? (COMPOUND_LIFTS.has(exercise.id) || exercise.compound ? REST_COMPOUND : REST_ACCESSORY),
  }
}

// Your numbers for an exercise, falling back to the program's starting values
// until you change them. Reps and hold seconds are remembered separately, so
// switching modes never loses either; `reps` here is whichever is active.
function settingsOf(s, exercise) {
  const saved = s.exerciseSettings?.[exercise.id]
  const hold = setupOf(s, exercise).mode === 'hold'
  const key = hold ? 'holds' : 'reps'
  const fallback = hold ? (exercise.durationSeconds ?? 30) : (exercise.isTime ? 10 : lowReps(exercise.reps))
  return {
    key,
    bar: saved?.bar ?? exercise.weight.bar,
    weight: saved?.weight ?? exercise.weight.value,
    reps: saved?.[key] ?? Array(exercise.sets).fill(fallback),
  }
}

// What an exercise is done with: your pick, else what the old Assist switch
// said (assisted with weight on it, bodyweight without), else the bank's.
function equipmentOf(s, exercise) {
  const picked = s.equipment?.[exercise.id]
  if (picked) return picked
  const assist = s.assist?.[exercise.id]
  if (assist) return settingsOf(s, exercise).weight > 0 ? 'assisted' : 'bodyweight'
  const fallback = defaultEquipment(exercise)
  return assist === false && fallback === 'assisted' ? 'bodyweight' : fallback
}

// Which sets of an exercise are ticked — one entry per remembered set.
function ticksOf(s, workoutId, exercise) {
  const n = settingsOf(s, exercise).reps.length
  const ticked = s.checks?.[workoutId]?.exercises?.[exercise.id] ?? []
  return Array.from({ length: n }, (_, i) => !!ticked[i])
}

// Writes an exercise's numbers back, putting the active list under its key.
function writeSettings(s, exercise, fn) {
  const { key, reps, ...rest } = fn(settingsOf(s, exercise))
  const saved = s.exerciseSettings?.[exercise.id] ?? {}
  return {
    ...s,
    exerciseSettings: { ...s.exerciseSettings, [exercise.id]: { ...saved, ...rest, [key]: reps } },
  }
}

function writeChecks(s, workoutId, fn) {
  return { ...s, checks: { ...s.checks, [workoutId]: fn(s.checks?.[workoutId] ?? {}) } }
}

function writeTicks(s, workoutId, exercise, fn) {
  const next = fn(ticksOf(s, workoutId, exercise))
  return writeChecks(s, workoutId, cur => ({
    ...cur,
    exercises: { ...cur.exercises, [exercise.id]: next },
  }))
}

// An activity's count. Number() also reads a true/false from the earlier
// tick-only build as 1/0.
function countOf(s, id) {
  return Number(s.activities?.[id]) || 0
}

// How long one class or walk is, and whether it's hard (vigorous) work.
function cardioSettingOf(s, kind) {
  return { ...CARDIO_DEFAULTS[kind], ...s.cardioSettings?.[kind] }
}

// This week's classes with what you did in each. The class count is the
// source of truth; classes it has that the log doesn't (logged before the
// questions existed) count as the default: 45 hard minutes, full body.
function classesOf(s) {
  const n = countOf(s, 'class')
  const log = (s.classLog ?? []).slice(0, n)
  return [...log, ...Array.from({ length: n - log.length }, () => CLASS_LEGACY)]
}

function lastClassOf(s) {
  return { ...CLASS_DEFAULT, ...s.lastClass }
}

// Where the Log a class sheet starts: everything off, with the last class's
// length and effort ready for when you turn cardio on.
function newClassOf(s) {
  const { minutes, hard, stretchMinutes } = lastClassOf(s)
  return { ...CLASS_DEFAULT, minutes, hard, stretchMinutes }
}

// Every cardio session this week: each class with cardio, plus walks and
// other cardio. A walk is logged at its length when you tap +; any the
// count has that the log doesn't count at today's length.
function cardioSessionsOf(s) {
  const logged = s.cardio ?? []
  const out = classesOf(s).filter(c => c.cardio).map(c => ({ kind: 'class', minutes: c.minutes, hard: c.hard }))
  out.push(...logged.filter(x => x.kind === 'other'))
  const walks = logged.filter(x => x.kind === 'walk').slice(0, countOf(s, 'walk'))
  const missing = countOf(s, 'walk') - walks.length
  out.push(...walks, ...Array.from({ length: missing }, () => ({ kind: 'walk', ...cardioSettingOf(s, 'walk') })))
  return out
}

// Cardio minutes as the health guidelines count them: a hard minute counts
// as two easy ones. Split by kind for history, plus the total.
function cardioWeekOf(s) {
  const by = { class: 0, walk: 0, other: 0 }
  for (const x of cardioSessionsOf(s)) by[x.kind] += x.minutes * (x.hard ? 2 : 1)
  return { ...by, total: by.class + by.walk + by.other }
}

// A kind's logged sessions, in log order: walks (counting any logged before
// lengths were saved), or other cardio.
function sessionsOfKind(s, kind) {
  return kind === 'walk' ? cardioSessionsOf(s).filter(x => x.kind === 'walk') : (s.cardio ?? []).filter(x => x.kind === kind)
}

// Writes a kind's sessions back; walks keep their count in step.
function writeSessions(s, kind, list) {
  const next = { ...s, cardio: [...(s.cardio ?? []).filter(x => x.kind !== kind), ...list] }
  return kind === 'walk' ? { ...next, activities: { ...s.activities, walk: list.length } } : next
}

// Drops the latest logged session of a kind.
function dropLastCardio(list, kind) {
  const i = list.findLastIndex(x => x.kind === kind)
  return i < 0 ? list : list.filter((_, j) => j !== i)
}

// A gym workout counts toward the week only once every set of every exercise
// is ticked. (The warm-up and stretches aren't required.)
function workoutComplete(s, workoutId) {
  const list = exercisesOf(s, workoutId)
  return list.length > 0 && list.every(ex => ticksOf(s, workoutId, ex).every(Boolean))
}

// A plan's exercises come in two lists, each picked from the exercise bank:
//   main – what the plan is for; only exercises that fit it (see fitsPlan)
//   core – its Core section at the end, shown while that's switched on
// Saved under `order` and `coreLists`. Earlier saves kept core exercises in
// `order`; they're read as the Core section until it's edited.
const LIST_KEY = { main: 'order', core: 'coreLists' }

function defaultIds(workoutId) {
  return (workouts[workoutId]?.exercises ?? []).map(e => e.id)
}

function listIds(s, workoutId, section) {
  const saved = section === 'core'
    ? s.coreLists?.[workoutId] ?? (s.order?.[workoutId]?.some(id => EXERCISE_BY_ID[id] && isCore(EXERCISE_BY_ID[id])) ? s.order[workoutId] : DEFAULT_CORE[workoutId] ?? [])
    : s.order?.[workoutId] ?? defaultIds(workoutId)
  const keep = id => {
    const ex = EXERCISE_BY_ID[id]
    return ex && (section === 'core' ? isCore(ex) : fitsPlan(ex, workoutId))
  }
  const ids = saved.filter(keep)
  return section === 'main' && ids.length === 0 ? defaultIds(workoutId).filter(keep) : ids
}

function coreOnOf(s, workoutId) {
  return s.coreOn?.[workoutId] ?? CORE_ON_BY_DEFAULT[workoutId] ?? false
}

// The plan's exercises as you do them: the main list, then Core if it's on.
function exerciseIdsOf(s, workoutId) {
  return [...listIds(s, workoutId, 'main'), ...(coreOnOf(s, workoutId) ? listIds(s, workoutId, 'core') : [])]
}

function exercisesOf(s, workoutId) {
  return exerciseIdsOf(s, workoutId).map(id => EXERCISE_BY_ID[id])
}

// Which list an exercise in a plan sits in.
function sectionOf(exercise) {
  return isCore(exercise) ? 'core' : 'main'
}

// Drops ticks on exercises that are no longer in either of a plan's lists.
function pruneTicks(s, workoutId) {
  const inPlan = new Set([...listIds(s, workoutId, 'main'), ...listIds(s, workoutId, 'core')])
  const ticks = s.checks?.[workoutId]?.exercises ?? {}
  const kept = Object.fromEntries(Object.entries(ticks).filter(([id]) => inPlan.has(id)))
  return writeChecks(s, workoutId, cur => ({ ...cur, exercises: kept }))
}

// Writing the main list also pins the Core section as it is, so Core isn't
// read from the new main list (where older saves kept it).
function writeList(s, workoutId, section, ids) {
  const key = LIST_KEY[section]
  const pinned = section === 'main' && !s.coreLists?.[workoutId]
    ? { coreLists: { ...s.coreLists, [workoutId]: listIds(s, workoutId, 'core') } }
    : {}
  return pruneTicks({ ...s, ...pinned, [key]: { ...s[key], [workoutId]: ids } }, workoutId)
}

// What a week is made of: finished gym workouts, classes that count as
// workouts (see classIsWorkout), each walk and rest logged, and other cardio
// sessions long enough to count as workouts.
function weekOf(s) {
  return {
    gym: GYM_ORDER.filter(id => workoutComplete(s, id)).length,
    ...Object.fromEntries(activities.map(a => [a.id, countOf(s, a.id)])),
    class: classesOf(s).filter(classIsWorkout).length,
    cardio: (s.cardio ?? []).filter(x => x.kind === 'other' && cardioIsWorkout(x)).length,
    stretchWork: stretchWorkoutsOf(s),
  }
}

// Your stretch sessions on your own this week. The count is the source of
// truth; sessions logged before lengths were asked have no minutes.
function ownStretchesOf(s) {
  const n = Number(s.stretchExtra) || 0
  const log = (s.stretchLog ?? []).slice(0, n)
  return [...log, ...Array.from({ length: n - log.length }, () => ({ minutes: null }))]
}

// A list's stretches — a gym workout's or the Full-Body Stretch — as you've
// set them up from the stretch bank, or its starting stretches.
// Only stretches that fit the list count (see stretchFits); if none of a saved
// list does, it falls back to the starting stretches.
function stretchesOf(s, listId) {
  const pick = ids => ids.map(id => STRETCH_BY_ID[id]).filter(x => x && stretchFits(x, listId))
  const saved = pick(s.stretchLists?.[listId] ?? [])
  return saved.length ? saved : pick(defaultStretchIds(listId))
}

// Writes a list's stretch ids, dropping the tick of any stretch that left it.
function writeStretchList(s, listId, ids) {
  const ticks = s.checks?.[listId]?.stretches ?? {}
  const kept = Object.fromEntries(Object.entries(ticks).filter(([id]) => ids.includes(id)))
  return writeChecks({ ...s, stretchLists: { ...s.stretchLists, [listId]: ids } }, listId, cur => ({ ...cur, stretches: kept }))
}

// How long the Full-Body Stretch takes with your settings: every hold (both
// sides where it's per side), every set, and the rests between sets.
function routineSecondsOf(s) {
  return stretchesOf(s, STRETCH_ROUTINE.id).reduce((sum, x) => {
    const sets = s.stretchSets?.[x.id] ?? 1
    const hold = (s.customDurations?.[x.id] ?? x.duration) * ((s.perSide?.[x.id] ?? x.perSide) ? 2 : 1)
    return sum + hold * sets + (s.stretchRest?.[x.id] ?? 20) * (sets - 1)
  }, 0)
}

const longEnough = minutes => minutes >= STRETCH_WORKOUT_MINUTES

// Stretching that counts as a workout: the Full-Body Stretch, finished, if
// it runs 30+ minutes, and each 30+ minute session on your own.
function stretchWorkoutsOf(s) {
  const routineDone = stretchesOf(s, STRETCH_ROUTINE.id).every(x => s.checks?.[STRETCH_ROUTINE.id]?.stretches?.[x.id])
  const routine = routineDone && longEnough(Math.round(routineSecondsOf(s) / 60)) ? 1 : 0
  return routine + ownStretchesOf(s).filter(x => x.minutes !== null && longEnough(x.minutes)).length
}

// Stretch days: each gym workout whose stretches are all ticked, the
// full-body routine once it's all ticked, and stretches done on your own.
function stretchWeekOf(s) {
  const all = (id, list) => list.length > 0 && list.every(x => s.checks?.[id]?.stretches?.[x.id])
  const st = {
    gym: GYM_ORDER.filter(id => all(id, stretchesOf(s, id))).length,
    routine: all(STRETCH_ROUTINE.id, stretchesOf(s, STRETCH_ROUTINE.id)) ? 1 : 0,
    class: classesOf(s).filter(c => c.stretch).length,
    extra: Number(s.stretchExtra) || 0,
  }
  return { ...st, total: st.gym + st.routine + st.class + st.extra }
}

// A week as saved in history: the same numbers as the live cards, plus how
// far each plan got, pounds lifted (reps × weight on ticked rep sets), and
// what you ticked on each exercise — the raw material for Trends.
function summarize(s, endedAt) {
  let lifted = 0
  const lifts = {}
  const plans = GYM_ORDER.map(id => {
    let done = 0
    let total = 0
    for (const ex of exercisesOf(s, id)) {
      const { reps, weight } = settingsOf(s, ex)
      const ticks = ticksOf(s, id, ex)
      total += ticks.length
      done += ticks.filter(Boolean).length
      // Every exercise you ticked a set of: its mode, weight, the reps (or hold
      // seconds) of the ticked sets, and whether it was assisted — what the
      // Trends charts draw from.
      if (ticks.some(Boolean)) {
        const mode = setupOf(s, ex).mode
        const sets = reps.filter((_, i) => ticks[i])
        if (mode === 'reps') lifted += sets.reduce((n, r) => n + r * weight, 0)
        lifts[ex.id] = { mode, weight, sets, assist: equipmentOf(s, ex) === 'assisted' }
      }
    }
    return { id, done, total }
  })
  const entry = {
    start: s.lastResetAt ?? null,
    end: endedAt,
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

// ── Calendar weeks for history ─────────────────────────────────────────────
// Past weeks are filed by calendar week (Monday–Sunday, as "YYYY-MM-DD" of
// the Monday). A saved period belongs to the week its middle falls in, so a
// reset on Sunday night or Monday morning both file the week just finished;
// with no earlier reset, the day before the reset stands in for the middle.
function mondayOf(date) {
  const d = new Date(date)
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function calendarWeekOf(entry) {
  if (entry.weekStart) return entry.weekStart
  const end = new Date(entry.end).getTime()
  const anchor = entry.start ? (new Date(entry.start).getTime() + end) / 2 : end - 86400000
  return mondayOf(anchor)
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

// Earlier builds stored the plank's seconds under `reps`; they're holds now.
function migrate(s) {
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
  return settings === s.exerciseSettings ? s : { ...s, exerciseSettings: settings }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? migrate(JSON.parse(raw)) : {}
  } catch {
    return {}
  }
}

function saveState(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    // Storage may be unavailable (private mode / quota) — nothing to do.
  }
}

export function useStore() {
  const [state, setState] = useState(loadState)
  // Everything as it was just before the last reset, for Undo. Not saved.
  const [undoSnapshot, setUndoSnapshot] = useState(null)

  function update(fn) {
    setState(s => {
      const next = fn(s)
      saveState(next)
      return next
    })
  }

  // ── Your numbers (remembered) ────────────────────────────────────────────
  function getLog(workoutId, exercise) {
    const { bar, weight, reps } = settingsOf(state, exercise)
    const ticks = ticksOf(state, workoutId, exercise)
    return { bar, weight, sets: reps.map((r, i) => ({ reps: r, done: ticks[i] })) }
  }

  function setSetReps(exercise, index, value) {
    update(s => writeSettings(s, exercise, cur => ({
      ...cur,
      reps: cur.reps.map((r, i) => (i === index ? value : r)),
    })))
  }

  // A hold's time is set once, in the settings sheet, for every set.
  function setHoldTime(exercise, seconds) {
    update(s => writeSettings(s, exercise, cur => ({ ...cur, reps: cur.reps.map(() => seconds) })))
  }

  function setWeight(exercise, weight) {
    update(s => writeSettings(s, exercise, cur => ({ ...cur, weight })))
  }

  function setBar(exercise, bar) {
    update(s => writeSettings(s, exercise, cur => ({ ...cur, bar })))
  }

  function addSet(exercise) {
    update(s => writeSettings(s, exercise, cur => ({ ...cur, reps: [...cur.reps, cur.reps.at(-1)] })))
  }

  // Drops the last set along with any tick on it, so adding it back later
  // starts unticked.
  function removeSet(exercise) {
    update(s => {
      const n = settingsOf(s, exercise).reps.length - 1
      if (n < 1) return s
      const checks = {}
      for (const [id, c] of Object.entries(s.checks ?? {})) {
        const t = c.exercises?.[exercise.id]
        checks[id] = t?.length > n
          ? { ...c, exercises: { ...c.exercises, [exercise.id]: t.slice(0, n) } }
          : c
      }
      return { ...writeSettings(s, exercise, cur => ({ ...cur, reps: cur.reps.slice(0, n) })), checks }
    })
  }

  // ── Checkmarks (cleared by reset) ────────────────────────────────────────
  function toggleSet(workoutId, exercise, index) {
    update(s => writeTicks(s, workoutId, exercise, t => t.map((x, i) => (i === index ? !x : x))))
  }

  // Tick every set of an exercise, or clear them all if they're all ticked.
  function toggleExercise(workoutId, exercise) {
    update(s => writeTicks(s, workoutId, exercise, t => {
      const all = t.every(Boolean)
      return t.map(() => !all)
    }))
  }

  function workoutProgress(workoutId) {
    let done = 0
    let total = 0
    for (const ex of exercisesOf(state, workoutId)) {
      const t = ticksOf(state, workoutId, ex)
      total += t.length
      done += t.filter(Boolean).length
    }
    return { done, total }
  }

  // ── Exercise order per workout (remembered) ──────────────────────────────
  function getExercises(workoutId) {
    return exercisesOf(state, workoutId)
  }

  // The plan's two lists, and whether Core is on.
  function getExerciseSections(workoutId) {
    const ex = section => listIds(state, workoutId, section).map(id => EXERCISE_BY_ID[id])
    return { main: ex('main'), core: ex('core'), coreOn: coreOnOf(state, workoutId) }
  }

  function setCoreOn(workoutId, on) {
    update(s => ({ ...s, coreOn: { ...s.coreOn, [workoutId]: on } }))
  }

  function isCustomOrder(workoutId) {
    return !!state.order?.[workoutId] || !!state.coreLists?.[workoutId]
  }

  // Puts one exercise from the bank in another's place, in the same list.
  function swapExercise(workoutId, oldId, newId) {
    update(s => {
      const section = sectionOf(EXERCISE_BY_ID[oldId])
      const ids = listIds(s, workoutId, section)
      const fits = section === 'core' ? isCore(EXERCISE_BY_ID[newId]) : fitsPlan(EXERCISE_BY_ID[newId], workoutId)
      if (ids.includes(newId) || !fits) return s
      return writeList(s, workoutId, section, ids.map(id => (id === oldId ? newId : id)))
    })
  }

  // Adds to the main list or, for a core exercise, the Core section.
  function addExercise(workoutId, id) {
    update(s => {
      const ex = EXERCISE_BY_ID[id]
      const section = sectionOf(ex)
      if (section === 'main' && !fitsPlan(ex, workoutId)) return s
      const ids = listIds(s, workoutId, section)
      return ids.includes(id) ? s : writeList(s, workoutId, section, [...ids, id])
    })
  }

  // The main list always keeps at least one exercise; Core can be emptied.
  function removeExercise(workoutId, id) {
    update(s => {
      const section = sectionOf(EXERCISE_BY_ID[id])
      const ids = listIds(s, workoutId, section)
      if (section === 'main' && ids.length <= 1) return s
      return writeList(s, workoutId, section, ids.filter(x => x !== id))
    })
  }

  // Moves an exercise up (-1) or down (+1) one place.
  function moveExercise(workoutId, exerciseId, delta) {
    update(s => {
      const section = sectionOf(EXERCISE_BY_ID[exerciseId])
      const ids = listIds(s, workoutId, section)
      const i = ids.indexOf(exerciseId)
      const j = i + delta
      if (i < 0 || j < 0 || j >= ids.length) return s
      ;[ids[i], ids[j]] = [ids[j], ids[i]]
      return writeList(s, workoutId, section, ids)
    })
  }

  // Back to the plan's starting exercises (main and Core), in their order.
  function resetOrder(workoutId) {
    update(s => {
      const order = { ...s.order }
      const coreLists = { ...s.coreLists }
      delete order[workoutId]
      delete coreLists[workoutId]
      return pruneTicks({ ...s, order, coreLists }, workoutId)
    })
  }

  // ── Warm-up per gym workout ──────────────────────────────────────────────
  // Optional and off by default; when on, a timed warm-up heads the workout.
  function getWarmup(workoutId) {
    const saved = state.warmups?.[workoutId]
    return { on: saved?.on ?? false, minutes: saved?.minutes ?? 5 }
  }

  function setWarmup(workoutId, patch) {
    update(s => ({ ...s, warmups: { ...s.warmups, [workoutId]: { ...s.warmups?.[workoutId], ...patch } } }))
  }

  function getWarmupDone(workoutId) {
    return state.checks?.[workoutId]?.warmup ?? false
  }

  function setWarmupDone(workoutId, done) {
    update(s => writeChecks(s, workoutId, cur => ({ ...cur, warmup: done })))
  }

  function getStretchDone(workoutId, id) {
    return state.checks?.[workoutId]?.stretches?.[id] ?? false
  }

  // ── Stretch lists (remembered) ───────────────────────────────────────────
  function getStretches(listId) {
    return stretchesOf(state, listId)
  }

  function isCustomStretches(listId) {
    return !!state.stretchLists?.[listId]
  }

  // Puts one stretch from the bank in another's place.
  function swapStretch(listId, oldId, newId) {
    update(s => {
      const ids = stretchesOf(s, listId).map(x => x.id)
      if (ids.includes(newId) || !stretchFits(STRETCH_BY_ID[newId] ?? {}, listId)) return s
      return writeStretchList(s, listId, ids.map(id => (id === oldId ? newId : id)))
    })
  }

  function addStretch(listId, id) {
    update(s => {
      const ids = stretchesOf(s, listId).map(x => x.id)
      if (ids.includes(id) || !STRETCH_BY_ID[id] || !stretchFits(STRETCH_BY_ID[id], listId)) return s
      return writeStretchList(s, listId, [...ids, id])
    })
  }

  // A list always keeps at least one stretch.
  function removeStretch(listId, id) {
    update(s => {
      const ids = stretchesOf(s, listId).map(x => x.id)
      return ids.length <= 1 ? s : writeStretchList(s, listId, ids.filter(x => x !== id))
    })
  }

  function moveStretch(listId, id, delta) {
    update(s => {
      const ids = stretchesOf(s, listId).map(x => x.id)
      const i = ids.indexOf(id)
      const j = i + delta
      if (i < 0 || j < 0 || j >= ids.length) return s
      ;[ids[i], ids[j]] = [ids[j], ids[i]]
      return writeStretchList(s, listId, ids)
    })
  }

  // Back to the starting stretches (ticks on ones that leave are dropped).
  function resetStretches(listId) {
    update(s => {
      const next = writeStretchList(s, listId, defaultStretchIds(listId))
      const lists = { ...next.stretchLists }
      delete lists[listId]
      return { ...next, stretchLists: lists }
    })
  }

  function toggleStretch(workoutId, id) {
    update(s => writeChecks(s, workoutId, cur => ({
      ...cur,
      stretches: { ...cur.stretches, [id]: !(cur.stretches?.[id] ?? false) },
    })))
  }

  // How many days you've logged an activity since the last reset.
  function getActivityCount(id) {
    return countOf(state, id)
  }

  // A walk also logs its cardio minutes, at its current length. A class
  // logged this way repeats your last class (the sheet uses logClass).
  function addActivity(id) {
    if (id === 'class') return logClass(lastClassOf(state))
    update(s => {
      const next = { ...s, activities: { ...s.activities, [id]: countOf(s, id) + 1 } }
      if (!CARDIO_DEFAULTS[id]) return next
      const kept = cardioSessionsOf(s).filter(x => x.kind === id)
      const others = (s.cardio ?? []).filter(x => x.kind !== id)
      return { ...next, cardio: [...others, ...kept, { kind: id, ...cardioSettingOf(s, id) }] }
    })
  }

  function removeActivity(id) {
    update(s => ({
      ...s,
      activities: { ...s.activities, [id]: Math.max(0, countOf(s, id) - 1) },
      ...(id === 'class'
        ? { classLog: classesOf(s).slice(0, -1) }
        : { cardio: dropLastCardio(s.cardio ?? [], id) }),
    }))
  }

  // ── Classes ──────────────────────────────────────────────────────────────
  // Logs a class with your answers, and remembers them for the next one.
  function logClass(answers) {
    const { cardio, minutes, hard, strength, areas, stretch, stretchMinutes } = answers
    const entry = { at: answers.at ?? new Date().toISOString(), cardio, minutes, hard, strength, areas, stretch, stretchMinutes }
    update(s => ({
      ...s,
      activities: { ...s.activities, class: countOf(s, 'class') + 1 },
      classLog: [...classesOf(s), entry],
      lastClass: { cardio, minutes, hard, strength, areas, stretch, stretchMinutes },
    }))
  }

  // ── Editing what you logged ──────────────────────────────────────────────
  // Each takes the item's place in its list (as `classes`, `walks`,
  // `otherCardio` and `ownStretches` give them) and a patch — new answers,
  // and `at` to move it to another day.
  function editClass(index, patch) {
    update(s => ({ ...s, classLog: classesOf(s).map((c, i) => (i === index ? { ...c, ...patch } : c)) }))
  }

  function deleteClass(index) {
    update(s => {
      const list = classesOf(s).filter((_, i) => i !== index)
      return { ...s, classLog: list, activities: { ...s.activities, class: list.length } }
    })
  }

  // kind: 'walk' or 'other'
  function editCardio(kind, index, patch) {
    update(s => writeSessions(s, kind, sessionsOfKind(s, kind).map((x, i) => (i === index ? { ...x, ...patch } : x))))
  }

  function deleteCardio(kind, index) {
    update(s => writeSessions(s, kind, sessionsOfKind(s, kind).filter((_, i) => i !== index)))
  }

  function editOwnStretch(index, patch) {
    update(s => ({ ...s, stretchLog: ownStretchesOf(s).map((x, i) => (i === index ? { ...x, ...patch } : x)) }))
  }

  function deleteOwnStretch(index) {
    update(s => {
      const list = ownStretchesOf(s).filter((_, i) => i !== index)
      return { ...s, stretchLog: list, stretchExtra: list.length }
    })
  }

  function getNewClass() {
    return newClassOf(state)
  }

  // ── Cardio ───────────────────────────────────────────────────────────────
  function getCardioSetting(kind) {
    return cardioSettingOf(state, kind)
  }

  function setCardioSetting(kind, patch) {
    update(s => ({ ...s, cardioSettings: { ...s.cardioSettings, [kind]: { ...cardioSettingOf(s, kind), ...patch } } }))
  }

  // Cardio that isn't a class or a walk — a run, a bike ride — logged with
  // its own minutes and effort.
  const otherCardio = (state.cardio ?? []).filter(x => x.kind === 'other')

  // Clock minutes logged this week for a kind (class, walk or other).
  function getCardioMinutes(kind) {
    return cardioSessionsOf(state).filter(x => x.kind === kind).reduce((n, x) => n + x.minutes, 0)
  }

  // A walk with its own length and effort; the next walk starts from these.
  function addWalk(minutes, hard, at = new Date().toISOString()) {
    update(s => {
      const kept = cardioSessionsOf(s).filter(x => x.kind === 'walk')
      const others = (s.cardio ?? []).filter(x => x.kind !== 'walk')
      return {
        ...s,
        activities: { ...s.activities, walk: countOf(s, 'walk') + 1 },
        cardio: [...others, ...kept, { kind: 'walk', minutes, hard, at }],
        cardioSettings: { ...s.cardioSettings, walk: { minutes, hard } },
      }
    })
  }

  // This week's walks, each with its length (oldest first).
  const walks = cardioSessionsOf(state).filter(x => x.kind === 'walk')

  function addOtherCardio(minutes, hard, at = new Date().toISOString()) {
    update(s => ({ ...s, cardio: [...(s.cardio ?? []), { kind: 'other', minutes, hard, at }] }))
  }

  function removeOtherCardio() {
    update(s => ({ ...s, cardio: dropLastCardio(s.cardio ?? [], 'other') }))
  }

  // Anything to clear? Drives whether the reset button is enabled.
  const hasChecks =
    Object.values(state.activities ?? {}).some(v => Number(v) > 0) ||
    Number(state.stretchExtra) > 0 ||
    (state.cardio ?? []).length > 0 ||
    Object.values(state.checks ?? {}).some(c =>
      Object.values(c.exercises ?? {}).some(t => t.some(Boolean)) ||
      Object.values(c.stretches ?? {}).some(Boolean) ||
      !!c.warmup)

  // This week, computed the same way it's saved to history on reset.
  const week = weekOf(state)
  // Gym workouts, classes, and long enough cardio or stretching count toward
  // the weekly goal; walks show as a bonus and rest days just show.
  const workoutsLogged = week.gym + week.class + week.cardio + week.stretchWork

  const stretchWeek = stretchWeekOf(state)
  const cardioWeek = cardioWeekOf(state)
  const classes = classesOf(state)

  // A stretch session on your own, with how long it was.
  function addOwnStretch(minutes, at = new Date().toISOString()) {
    update(s => ({
      ...s,
      stretchExtra: (Number(s.stretchExtra) || 0) + 1,
      stretchLog: [...ownStretchesOf(s), { at, minutes }],
      lastOwnStretch: minutes,
    }))
  }

  // Drops the latest session on your own.
  function removeOwnStretch() {
    update(s => {
      const list = ownStretchesOf(s).slice(0, -1)
      return { ...s, stretchExtra: list.length, stretchLog: list }
    })
  }

  // Older callers: +1 logs a session at your last length.
  function addStretchExtra(delta) {
    if (delta > 0) addOwnStretch(state.lastOwnStretch ?? 15)
    else removeOwnStretch()
  }

  const ownStretches = ownStretchesOf(state)
  const routineMinutes = Math.round(routineSecondsOf(state) / 60)

  // Unticks every set and stretch and zeroes the activity counts. Your
  // numbers and settings are left alone.
  // Saves the finished week to history first, so past weeks stay viewable. A
  // second reset in the same calendar week adds to that week's entry.
  function resetChecks() {
    setUndoSnapshot(state)
    update(s => {
      const now = new Date().toISOString()
      const entry = summarize(s, now)
      const [latest, ...older] = s.history ?? []
      const history = latest && calendarWeekOf(latest) === entry.weekStart
        ? [mergeWeeks({ ...latest, weekStart: entry.weekStart }, entry), ...older]
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
      }
    })
  }

  // Puts everything back as it was before the last reset.
  function undoReset() {
    if (!undoSnapshot) return
    const snapshot = undoSnapshot
    update(() => snapshot)
    setUndoSnapshot(null)
  }

  // Stable, so the Undo bar's timeout isn't restarted on every render.
  const dismissUndo = useCallback(() => setUndoSnapshot(null), [])

  // ── Backup / restore ─────────────────────────────────────────────────────
  // Everything the app stores, as one object for a backup file.
  function exportData() {
    return state
  }

  function markBackedUp() {
    update(s => ({ ...s, lastBackupAt: new Date().toISOString() }))
  }

  // Replaces everything with a backup's data (run through the same migration
  // as a normal load, so older backups still work). The backup itself counts
  // as your latest backup.
  function restoreData(data, exportedAt) {
    update(() => migrate({ ...data, lastBackupAt: exportedAt ?? data.lastBackupAt }))
  }

  // ── Exercise setup (remembered) ──────────────────────────────────────────
  function getSetup(exercise) {
    return setupOf(state, exercise)
  }

  function setSetup(exercise, patch) {
    update(s => ({
      ...s,
      setup: { ...s.setup, [exercise.id]: { ...s.setup?.[exercise.id], ...patch } },
    }))
  }

  // ── Per-item settings (remembered) ───────────────────────────────────────
  function getEquipment(exercise) {
    return equipmentOf(state, exercise)
  }

  function setEquipment(exercise, equipment) {
    update(s => ({
      ...s,
      equipment: { ...s.equipment, [exercise.id]: equipment },
      assist: { ...s.assist, [exercise.id]: equipment === 'assisted' },
    }))
  }

  function getCustomDuration(itemId, defaultDuration) {
    return state.customDurations?.[itemId] ?? defaultDuration
  }

  function setCustomDuration(itemId, seconds) {
    update(s => ({ ...s, customDurations: { ...s.customDurations, [itemId]: seconds } }))
  }

  function getPerSide(itemId, defaultPerSide) {
    return state.perSide?.[itemId] ?? defaultPerSide
  }

  function setPerSide(itemId, value) {
    update(s => ({ ...s, perSide: { ...s.perSide, [itemId]: value } }))
  }

  function getStretchSets(stretchId) {
    return state.stretchSets?.[stretchId] ?? 1
  }

  function setStretchSets(stretchId, count) {
    update(s => ({ ...s, stretchSets: { ...s.stretchSets, [stretchId]: count } }))
  }

  function getStretchRest(stretchId) {
    return state.stretchRest?.[stretchId] ?? 20
  }

  function setStretchRest(stretchId, seconds) {
    update(s => ({ ...s, stretchRest: { ...s.stretchRest, [stretchId]: seconds } }))
  }

  return {
    getLog,
    setSetReps,
    setWeight,
    setHoldTime,
    setBar,
    addSet,
    removeSet,
    toggleSet,
    toggleExercise,
    workoutProgress,
    getExercises,
    isCustomOrder,
    getExerciseSections,
    setCoreOn,
    swapExercise,
    addExercise,
    removeExercise,
    moveExercise,
    resetOrder,
    getWarmup,
    setWarmup,
    getWarmupDone,
    setWarmupDone,
    getStretchDone,
    getStretches,
    isCustomStretches,
    swapStretch,
    addStretch,
    removeStretch,
    moveStretch,
    resetStretches,
    toggleStretch,
    getActivityCount,
    addActivity,
    removeActivity,
    hasChecks,
    lastBackupAt: state.lastBackupAt ?? null,
    history: state.history ?? [],
    canUndoReset: undoSnapshot !== null,
    undoReset,
    dismissUndo,
    exportData,
    markBackedUp,
    restoreData,
    week,
    workoutsLogged,
    stretchWeek,
    cardioWeek,
    classes,
    logClass,
    getNewClass,
    editClass,
    deleteClass,
    editCardio,
    deleteCardio,
    editOwnStretch,
    deleteOwnStretch,
    getCardioSetting,
    setCardioSetting,
    otherCardio,
    walks,
    addWalk,
    getCardioMinutes,
    addOtherCardio,
    removeOtherCardio,
    addStretchExtra,
    addOwnStretch,
    removeOwnStretch,
    ownStretches,
    lastOwnStretch: state.lastOwnStretch ?? 15,
    routineMinutes,
    resetChecks,
    getSetup,
    setSetup,
    getEquipment,
    setEquipment,
    getCustomDuration,
    setCustomDuration,
    getPerSide,
    setPerSide,
    getStretchSets,
    setStretchSets,
    getStretchRest,
    setStretchRest,
  }
}
