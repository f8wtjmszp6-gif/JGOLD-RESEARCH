import { useCallback, useState } from 'react'
import { workouts, activities, GYM_ORDER, STRETCH_ROUTINE, COMPOUND_LIFTS, REST_COMPOUND, REST_ACCESSORY } from '../data/workout'

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
//     stretchSets       { [stretchId]: count }  (rounds of a stretch, default 1)
//     stretchRest       { [stretchId]: seconds } (rest between those rounds, default 20)
//     lastBackupAt      ISO time of the last backup file you saved
//     history           [weekSummary, …] newest first — saved by each reset, never cleared
//     lastResetAt       ISO time of the last reset (the start of the current week)
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

// What a week is made of: finished gym workouts, plus each class, walk and
// rest logged.
function weekOf(s) {
  return {
    gym: GYM_ORDER.filter(id => workoutComplete(s, id)).length,
    ...Object.fromEntries(activities.map(a => [a.id, countOf(s, a.id)])),
  }
}

// Stretch days: each gym workout whose stretches are all ticked, the
// full-body routine once it's all ticked, and stretches done on your own.
function stretchWeekOf(s) {
  const all = (id, list) => list.length > 0 && list.every(x => s.checks?.[id]?.stretches?.[x.id])
  const st = {
    gym: GYM_ORDER.filter(id => all(id, workouts[id].stretches)).length,
    routine: all(STRETCH_ROUTINE.id, STRETCH_ROUTINE.stretches) ? 1 : 0,
    extra: Number(s.stretchExtra) || 0,
  }
  return { ...st, total: st.gym + st.routine + st.extra }
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
    for (const ex of workouts[id].exercises) {
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
        lifts[ex.id] = { mode, weight, sets, assist: s.assist?.[ex.id] ?? !!ex.weight.assist }
      }
    }
    return { id, done, total }
  })
  const entry = {
    start: s.lastResetAt ?? null,
    end: endedAt,
    week: weekOf(s),
    stretch: stretchWeekOf(s),
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
    plans: b.plans.map(p => {
      const q = a.plans.find(x => x.id === p.id)
      return { ...p, done: Math.min(p.total, p.done + (q?.done ?? 0)) }
    }),
    lifted: a.lifted + b.lifted,
    lifts: { ...a.lifts, ...b.lifts },
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

  // This week, computed the same way it's saved to history on reset.
  const week = weekOf(state)
  // Only gym workouts and classes count toward the weekly goal; walks show
  // as a bonus and rest days just show.
  const workoutsLogged = week.gym + week.class

  const stretchWeek = stretchWeekOf(state)

  function addStretchExtra(delta) {
    update(s => ({ ...s, stretchExtra: Math.max(0, (Number(s.stretchExtra) || 0) + delta) }))
  }

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
        stretchExtra: 0,
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
    getStretchSets,
    setStretchSets,
    getStretchRest,
    setStretchRest,
  }
}
