import { useState } from 'react'
import { workouts, activities, STRETCH_ROUTINE, COMPOUND_LIFTS, REST_COMPOUND, REST_ACCESSORY } from '../data/workout'

const STORAGE_KEY = 'workout-tracker-v2'

// State is split into what you've set and what you've done:
//
//   Remembered — never cleared:
//     exerciseSettings  { [exerciseId]: { bar, weight, reps: [n, …], holds: [seconds, …] } }
//     setup             { [exerciseId]: { mode: 'reps' | 'hold', perSide, restOn, rest } }
//     warmups           { [workoutId]: { on, minutes } }
//     order             { [workoutId]: [exerciseId, …] }  (your exercise order)
//     assist            { [exerciseId]: bool }
//     customDurations   { [stretchId]: seconds }
//     perSide           { [stretchId]: bool }
//
//   Checkmarks — cleared by the header reset:
//     checks            { [workoutId]: { exercises: { [id]: [bool, …] }, stretches: { [id]: bool }, warmup: bool } }
//     activities        { class | walk | rest: count }
//     stretchExtra      count of stretch sessions done on your own (the hero's +)

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
    rest: saved?.rest ?? (COMPOUND_LIFTS.has(exercise.id) ? REST_COMPOUND : REST_ACCESSORY),
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

// A gym workout counts toward the week only once every set of every exercise
// is ticked. (The warm-up and stretches aren't required.)
function workoutComplete(s, workoutId) {
  const list = workouts[workoutId].exercises
  return list.length > 0 && list.every(ex => ticksOf(s, workoutId, ex).every(Boolean))
}

// A workout's exercise ids in your order. Any exercise not in the saved
// order (e.g. added to the program later) goes at the end.
function orderIds(s, workoutId) {
  const ids = (workouts[workoutId]?.exercises ?? []).map(e => e.id)
  const saved = (s.order?.[workoutId] ?? []).filter(id => ids.includes(id))
  return [...saved, ...ids.filter(id => !saved.includes(id))]
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
    for (const ex of workouts[workoutId].exercises) {
      const t = ticksOf(state, workoutId, ex)
      total += t.length
      done += t.filter(Boolean).length
    }
    return { done, total }
  }

  // ── Exercise order per workout (remembered) ──────────────────────────────
  function getExercises(workoutId) {
    const list = workouts[workoutId]?.exercises ?? []
    return orderIds(state, workoutId).map(id => list.find(e => e.id === id))
  }

  function isCustomOrder(workoutId) {
    return !!state.order?.[workoutId]
  }

  // Moves an exercise up (-1) or down (+1) one place.
  function moveExercise(workoutId, exerciseId, delta) {
    update(s => {
      const ids = orderIds(s, workoutId)
      const i = ids.indexOf(exerciseId)
      const j = i + delta
      if (i < 0 || j < 0 || j >= ids.length) return s
      ;[ids[i], ids[j]] = [ids[j], ids[i]]
      return { ...s, order: { ...s.order, [workoutId]: ids } }
    })
  }

  function resetOrder(workoutId) {
    update(s => {
      const order = { ...s.order }
      delete order[workoutId]
      return { ...s, order }
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

  function addActivity(id) {
    update(s => ({ ...s, activities: { ...s.activities, [id]: countOf(s, id) + 1 } }))
  }

  function removeActivity(id) {
    update(s => ({ ...s, activities: { ...s.activities, [id]: Math.max(0, countOf(s, id) - 1) } }))
  }

  // Anything to clear? Drives whether the reset button is enabled.
  const hasChecks =
    Object.values(state.activities ?? {}).some(v => Number(v) > 0) ||
    Number(state.stretchExtra) > 0 ||
    Object.values(state.checks ?? {}).some(c =>
      Object.values(c.exercises ?? {}).some(t => t.some(Boolean)) ||
      Object.values(c.stretches ?? {}).some(Boolean) ||
      !!c.warmup)

  // What this week is made of: each gym workout you've finished counts as a
  // day, plus every class, walk and rest you've logged.
  const week = {
    gym: Object.keys(workouts).filter(id => workoutComplete(state, id)).length,
    ...Object.fromEntries(activities.map(a => [a.id, countOf(state, a.id)])),
  }
  // Only gym workouts and classes count toward the weekly goal; walks show
  // as a bonus and rest days just show.
  const workoutsLogged = week.gym + week.class

  // Stretching this week: each gym workout whose stretches are all ticked,
  // the full-body routine once it's all ticked, and stretches done on your own.
  const allStretched = (id, list) => list.length > 0 && list.every(x => state.checks?.[id]?.stretches?.[x.id])
  const stretchWeek = {
    gym: Object.values(workouts).filter(w => allStretched(w.id, w.stretches)).length,
    routine: allStretched(STRETCH_ROUTINE.id, STRETCH_ROUTINE.stretches) ? 1 : 0,
    extra: Number(state.stretchExtra) || 0,
  }
  stretchWeek.total = stretchWeek.gym + stretchWeek.routine + stretchWeek.extra

  function addStretchExtra(delta) {
    update(s => ({ ...s, stretchExtra: Math.max(0, (Number(s.stretchExtra) || 0) + delta) }))
  }

  // Unticks every set and stretch and zeroes the activity counts. Your
  // numbers and settings are left alone.
  function resetChecks() {
    update(s => ({ ...s, checks: {}, activities: {}, stretchExtra: 0 }))
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
  function getAssist(exerciseId, defaultAssist) {
    return state.assist?.[exerciseId] ?? defaultAssist
  }

  function setAssist(exerciseId, isAssist) {
    update(s => ({ ...s, assist: { ...s.assist, [exerciseId]: isAssist } }))
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
    moveExercise,
    resetOrder,
    getWarmup,
    setWarmup,
    getWarmupDone,
    setWarmupDone,
    getStretchDone,
    toggleStretch,
    getActivityCount,
    addActivity,
    removeActivity,
    hasChecks,
    week,
    workoutsLogged,
    stretchWeek,
    addStretchExtra,
    resetChecks,
    getSetup,
    setSetup,
    getAssist,
    setAssist,
    getCustomDuration,
    setCustomDuration,
    getPerSide,
    setPerSide,
  }
}
