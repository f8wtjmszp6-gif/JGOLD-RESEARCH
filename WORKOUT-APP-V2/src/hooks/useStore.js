import { useState } from 'react'
import { workouts, activities } from '../data/workout'

const STORAGE_KEY = 'workout-tracker-v2'

// State is split into what you've set and what you've done:
//
//   Remembered — never cleared:
//     exerciseSettings  { [exerciseId]: { bar, weight, reps: [n, …] } }
//     assist            { [exerciseId]: bool }
//     customDurations   { [stretchId]: seconds }
//     perSide           { [stretchId]: bool }
//
//   Checkmarks — cleared by the header reset:
//     checks            { [workoutId]: { exercises: { [id]: [bool, …] }, stretches: { [id]: bool } } }
//     activities        { class | walk | rest: count }

function lowReps(repsStr) {
  const n = parseInt(String(repsStr).split('–')[0])
  return isNaN(n) ? 0 : n
}

// ── Pure state helpers ─────────────────────────────────────────────────────
// These take the raw state so both readers and writers (inside the setState
// updater) agree on derived values without a stale closure.

// Your numbers for an exercise, falling back to the program's starting values
// until you change them.
function settingsOf(s, exercise) {
  const saved = s.exerciseSettings?.[exercise.id]
  const fallback = exercise.isTime ? exercise.durationSeconds : lowReps(exercise.reps)
  return {
    bar: saved?.bar ?? exercise.weight.bar,
    weight: saved?.weight ?? exercise.weight.value,
    reps: saved?.reps ?? Array(exercise.sets).fill(fallback),
  }
}

// Which sets of an exercise are ticked — one entry per remembered set.
function ticksOf(s, workoutId, exercise) {
  const n = settingsOf(s, exercise).reps.length
  const ticked = s.checks?.[workoutId]?.exercises?.[exercise.id] ?? []
  return Array.from({ length: n }, (_, i) => !!ticked[i])
}

function writeSettings(s, exercise, fn) {
  return {
    ...s,
    exerciseSettings: { ...s.exerciseSettings, [exercise.id]: fn(settingsOf(s, exercise)) },
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

// A gym workout counts toward the week once you've ticked any of its sets —
// a cut-short session still means you went.
function workoutStarted(s, workoutId) {
  return workouts[workoutId].exercises.some(ex => ticksOf(s, workoutId, ex).some(Boolean))
}

// ── Persistence ────────────────────────────────────────────────────────────

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
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
    Object.values(state.checks ?? {}).some(c =>
      Object.values(c.exercises ?? {}).some(t => t.some(Boolean)) ||
      Object.values(c.stretches ?? {}).some(Boolean))

  // What this week is made of: each gym workout you've started counts as a
  // day, plus every class, walk and rest you've logged. 1 workout + 2 classes = 3.
  const week = {
    gym: Object.keys(workouts).filter(id => workoutStarted(state, id)).length,
    ...Object.fromEntries(activities.map(a => [a.id, countOf(state, a.id)])),
  }
  const daysLogged = Object.values(week).reduce((n, v) => n + v, 0)

  // Unticks every set and stretch and zeroes the activity counts. Your
  // numbers and settings are left alone.
  function resetChecks() {
    update(s => ({ ...s, checks: {}, activities: {} }))
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
    setBar,
    addSet,
    removeSet,
    toggleSet,
    toggleExercise,
    workoutProgress,
    getStretchDone,
    toggleStretch,
    getActivityCount,
    addActivity,
    removeActivity,
    hasChecks,
    week,
    daysLogged,
    resetChecks,
    getAssist,
    setAssist,
    getCustomDuration,
    setCustomDuration,
    getPerSide,
    setPerSide,
  }
}
