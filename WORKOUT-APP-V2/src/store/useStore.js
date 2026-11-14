import { useCallback, useEffect, useState } from 'react'
import { SPORTS, TARGETED } from '../data/workout'
import { STRETCH_BY_ID, applyCustomStretches, applyStretchEdits } from '../data/stretches'
import { EXERCISE_BY_ID, applyCustomExercises, applyExerciseEdits, fitsPlan } from '../data/exercises'
import { sameDay } from '../utils/days'
import { STORAGE_KEY, migrate, loadState, saveState } from './persist'
import { setupOf, settingsOf, equipmentOf, splitOf, weekSetsOf, writeSplit, writeSettings, writeChecks, dayLogOf, writeTicks, countOf, cardioSettingOf, classesOf, newClassOf, cardioSessionsOf, rememberSport, warmupOf, cardioWeekOf, sessionsOfKind, writeSessions, dropLastCardio, listIds, coreOnOf, coreInMain, exercisesOf, sectionOf, writeList, writeCoreOn, weekOf, restDaysOf, ownStretchesOf, stretchesOf, routineLengthOf, writeStretchList, routineSecondsOf, stretchWeekOf, timerOf, goalsOf, sessionsOf, sessionOf, sessionCounts, finishedOf, fileSession, reopenOf, reopenSession, endSession, beginSession, startTargeted, settleRest, endPastSessions, planEndedOf, targetedOf, planName, weekDiffOf, resetWeekOf, putBackWeekOf, defaultEditsOf, restoreDefaultOf, undoDefaultEditOf, openSlotsOf, SLOT_SETS, fillSlot, dropSlot, discardSession, REPEATABLE } from './state'
import { summarize, weekStateOf, writeWeek, weeksOf, clearWeek, rollWeek, weekKeyOf, calendarWeekOf } from './weeks'
import { cardioMinutes } from '../utils/format'

// The store every screen reads and changes: this week's state plus the
// functions that change it (see makeStore), saved on every change.
export function useStore() {
  // A new exercise left without Save (the app closed on it) is dropped,
  // and any without a name.
  const [state, setState] = useState(() => {
    const s = loadState()
    const t = (s.customExercises ?? []).filter(c => c.draft || !c.name?.trim()).reduce((t, c) => withoutCustom(t, c.id), s)
    return (t.customStretches ?? []).filter(c => c.draft || !c.name?.trim()).reduce((u, c) => withoutCustomStretch(u, c.id), t)
  })
  // Your own exercises and your changes, over the bank, before anything
  // reads it.
  applyCustomExercises(state.customExercises)
  applyExerciseEdits(state.exerciseEdits)
  applyCustomStretches(state.customStretches)
  applyStretchEdits(state.stretchEdits)
  // Everything as it was just before the last reset, for Undo. Not saved.
  const [undoSnapshot, setUndoSnapshot] = useState(null)

  function update(fn) {
    setState(s => {
      const next = settleRest(endPastSessions(fn(s)))
      saveState(next)
      return next
    })
  }

  // Unticks every set and stretch and zeroes the activity counts. Your
  // numbers and settings are left alone.
  // Saves the finished week to history first, so past weeks stay viewable. A
  // second reset in the same calendar week adds to that week's entry.
  function resetChecks() {
    setUndoSnapshot(state)
    update(s => clearWeek(s, new Date().toISOString()))
  }

  // Checks for a new week when the app opens and whenever it comes back to
  // the front (a home-screen app can stay open for days).
  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== 'hidden') update(s => rollWeek(s))
    }
    check()
    document.addEventListener('visibilitychange', check)
    return () => document.removeEventListener('visibilitychange', check)
  }, [])

  // Stable, so the new-week note's timeout isn't restarted on every render.
  const dismissNewWeek = useCallback(() => {
    setState(s => {
      const next = { ...s }
      delete next.newWeek
      saveState(next)
      return next
    })
  }, [])

  // ── Weekly goals ─────────────────────────────────────────────────────────
  // A max below the min drags the min down with it (and the other way).
  function setGoal(key, patch) {
    update(s => {
      const g = { ...goalsOf(s)[key], ...patch }
      const fixed = 'min' in patch ? { min: g.min, max: Math.max(g.min, g.max) } : { min: Math.min(g.min, g.max), max: g.max }
      return { ...s, goals: { ...s.goals, [key]: fixed } }
    })
  }

  // The notifications you've opened the bell on (the last 50 are plenty).
  function markNotesSeen(ids) {
    update(s => {
      const seen = s.seenNotes ?? []
      return ids.every(id => seen.includes(id)) ? s : { ...s, seenNotes: [...new Set([...seen, ...ids])].slice(-50) }
    })
  }

  // ✕ on a notification: it's gone (and seen). One that's news again later,
  // like next week's backup reminder, has a new id and shows again.
  function dismissNote(id) {
    update(s => ({
      ...s,
      dismissedNotes: [...new Set([...(s.dismissedNotes ?? []), id])].slice(-50),
      seenNotes: [...new Set([...(s.seenNotes ?? []), id])].slice(-50),
    }))
  }

  function setTimer(patch) {
    update(s => ({ ...s, timer: { ...timerOf(s), ...patch } }))
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

  // Wipes everything this app keeps on the phone (never V1's data, which
  // shares the storage) and starts over, as if newly installed.
  function factoryReset() {
    try {
      for (const key of [STORAGE_KEY, 'workout-v2-theme', 'workout-v2-home-tab']) localStorage.removeItem(key)
    } catch {
      // Storage unavailable: nothing was saved to clear.
    }
    location.reload()
  }

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

  // A saved week as a store of its own, with the same calls as this week's:
  // what it reads is that week, and what it changes is written back into it.
  // Null for weeks saved before their details were kept.
  function weekStore(weekStart) {
    const entry = (state.history ?? []).find(e => calendarWeekOf(e) === weekStart)
    if (!entry?.details) return null
    return { ...makeStore(weekStateOf(state, entry), fn => update(s => writeWeek(s, weekStart, fn))), past: true, weekStart, entry }
  }

  return {
    ...makeStore(state, update),
    history: state.history ?? [],
    // This week so far, worked out the same way a saved week is, so Trends
    // can show it as it happens.
    current: { ...summarize(state, new Date().toISOString()), weekStart: weekKeyOf(new Date()), live: true },
    weeks: weeksOf(state),
    weekStore,
    goals: goalsOf(state),
    setGoal,
    setTimer,
    seenNotes: state.seenNotes ?? [],
    markNotesSeen,
    dismissedNotes: state.dismissedNotes ?? [],
    dismissNote,
    newWeek: state.newWeek ?? null,
    dismissNewWeek,
    canUndoReset: undoSnapshot !== null,
    undoReset,
    dismissUndo,
    resetChecks,
    exportData,
    markBackedUp,
    restoreData,
    factoryReset,
    lastBackupAt: state.lastBackupAt ?? null,
  }
}

// Everything you can read and change in one week, given its state and a way
// to change it. This week's store and each saved week's are made the same way.
function makeStore(state, update) {
  // When something added without a day happened: now, or, in a past week,
  // its last day.
  const nowIso = () => state.clockAt ?? new Date().toISOString()

  // ── Your numbers (remembered) ────────────────────────────────────────────
  // An exercise this week: your numbers, the main card's sets (each with its
  // place in your settings, as `index`), any split cards, and `all` — every
  // set, main and split, for whether it's done.
  function getLog(workoutId, exercise) {
    const { bar, weight } = settingsOf(state, exercise)
    const all = weekSetsOf(state, workoutId, exercise)
    const parts = (splitOf(state, workoutId, exercise)?.parts ?? []).map((p, j) => ({ weight: p.weight, sets: all.filter(x => x.part === j) }))
    return { bar, weight, sets: all.filter(x => x.part < 0), parts, all }
  }

  // An exercise's numbers as they stand (sets, reps, weight, bar), the same
  // in every plan it's in.
  function getNumbers(exercise) {
    return settingsOf(state, exercise)
  }

  // Everything saved for one exercise (its numbers, setup, equipment and
  // your changes to it), to put back with restoreExercise, as Cancel does.
  const EXERCISE_KEYS = ['exerciseSettings', 'setup', 'equipment', 'assist', 'exerciseEdits']
  function exerciseSnapshot(id) {
    return Object.fromEntries(EXERCISE_KEYS.map(k => [k, state[k]?.[id]]))
  }
  function restoreExercise(id, snap) {
    update(s => {
      const next = { ...s }
      for (const k of EXERCISE_KEYS) {
        const rest = { ...s[k] }
        if (snap[k] === undefined) delete rest[id]
        else rest[id] = snap[k]
        next[k] = rest
      }
      return next
    })
  }

  // Your own exercises: a new one starts blank (a chest exercise with
  // dumbbells, 3 × 8) and is filled in on its page; it's gone again if
  // that's cancelled. Returns its id.
  function addCustomExercise() {
    const id = `custom-${Date.now().toString(36)}`
    update(s => ({
      ...s,
      customExercises: [...(s.customExercises ?? []), {
        id, name: '', group: 'chest', covers: [], equipment: 'dumbbell', draft: true,
        sets: 3, reps: '8', weight: { bar: 45, value: 20 },
      }],
    }))
    return id
  }
  function renameCustomExercise(id, name) {
    update(s => ({ ...s, customExercises: (s.customExercises ?? []).map(c => (c.id === id ? { ...c, name } : c)) }))
  }
  // Takes it out of the bank and out of every plan's lists.
  function deleteCustomExercise(id) {
    update(s => withoutCustom(s, id))
  }
  // A new one's a draft until it's saved.
  function saveCustomExercise(id) {
    update(s => ({ ...s, customExercises: (s.customExercises ?? []).map(c => (c.id === id ? { ...c, draft: undefined } : c)) }))
  }

  // Your changes to an exercise's group, targets or rating (see
  // applyExerciseEdits).
  // Your own stretches, the same way: a new one starts blank and is filled
  // in on its page. Returns its id.
  function addCustomStretch() {
    const id = `custom-stretch-${Date.now().toString(36)}`
    update(s => ({
      ...s,
      customStretches: [...(s.customStretches ?? []), { id, name: '', area: 'back', muscles: [], duration: 30, perSide: true, draft: true }],
    }))
    return id
  }
  function renameCustomStretch(id, name) {
    update(s => ({ ...s, customStretches: (s.customStretches ?? []).map(c => (c.id === id ? { ...c, name } : c)) }))
  }
  function saveCustomStretch(id) {
    update(s => ({ ...s, customStretches: (s.customStretches ?? []).map(c => (c.id === id ? { ...c, draft: undefined } : c)) }))
  }
  function deleteCustomStretch(id) {
    update(s => withoutCustomStretch(s, id))
  }
  // A stretch's area and muscles (see applyStretchEdits).
  function setStretchEdit(id, patch) {
    update(s => ({ ...s, stretchEdits: { ...s.stretchEdits, [id]: { ...s.stretchEdits?.[id], ...patch } } }))
  }
  // Everything about a stretch you can change on its page, to put back with
  // restoreStretch (Cancel).
  const STRETCH_KEYS = ['stretchEdits', 'customDurations', 'perSide', 'stretchSets', 'stretchRest']
  function stretchSnapshot(id) {
    return Object.fromEntries(STRETCH_KEYS.map(k => [k, state[k]?.[id]]))
  }
  function restoreStretch(id, snap) {
    update(s => {
      const next = { ...s }
      for (const k of STRETCH_KEYS) {
        const rest = { ...s[k] }
        if (snap[k] === undefined) delete rest[id]
        else rest[id] = snap[k]
        next[k] = rest
      }
      return next
    })
  }

  function setExerciseEdit(id, patch) {
    update(s => ({ ...s, exerciseEdits: { ...s.exerciseEdits, [id]: { ...s.exerciseEdits?.[id], ...patch } } }))
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

  // A heavier bar brings the weight up with it: it can't be less than the bar.
  function setBar(exercise, bar) {
    update(s => writeSettings(s, exercise, cur => ({ ...cur, bar, weight: Math.max(cur.weight, bar) })))
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

  // Tick every set of an exercise, split cards too, or clear them all if
  // they're all ticked.
  function toggleExercise(workoutId, exercise) {
    update(s => {
      const on = !weekSetsOf(s, workoutId, exercise).every(x => x.done)
      const ticked = writeTicks(s, workoutId, exercise, t => t.map(() => on))
      return writeSplit(ticked, workoutId, exercise, sp => sp && { ...sp, parts: sp.parts.map(p => ({ ...p, ticks: p.reps.map(() => on) })) })
    })
  }

  // ── Splitting an exercise (this week only) ───────────────────────────────
  // Moves the sets you haven't ticked on a card (-1: the main one, else a
  // split card) to a new card right below it at `weight`. Needs at least one
  // set ticked and one not.
  function splitSets(workoutId, exercise, part, weight) {
    update(s => {
      const all = weekSetsOf(s, workoutId, exercise).filter(x => x.part === part)
      const done = all.filter(x => x.done)
      const left = all.filter(x => !x.done)
      if (!done.length || !left.length) return s
      const moved = { weight, reps: left.map(x => x.reps), ticks: left.map(() => false) }
      return writeSplit(s, workoutId, exercise, sp => {
        const parts = [...(sp?.parts ?? [])]
        if (part < 0) {
          return { count: settingsOf(s, exercise).reps.length, kept: done.map(x => x.index), parts: [moved, ...parts] }
        }
        parts.splice(part, 1, { ...parts[part], reps: done.map(x => x.reps), ticks: done.map(() => true) }, moved)
        return { ...sp, parts }
      })
    })
  }

  // Changes a split card: fn gets { weight, reps, ticks } and returns it.
  function editPart(workoutId, exercise, part, fn) {
    update(s => writeSplit(s, workoutId, exercise, sp => sp && { ...sp, parts: sp.parts.map((p, j) => (j === part ? fn(p) : p)) }))
  }

  function setPartWeight(workoutId, exercise, part, weight) {
    editPart(workoutId, exercise, part, p => ({ ...p, weight }))
  }

  function setPartReps(workoutId, exercise, part, index, reps) {
    editPart(workoutId, exercise, part, p => ({ ...p, reps: p.reps.map((r, i) => (i === index ? reps : r)) }))
  }

  function togglePartSet(workoutId, exercise, part, index) {
    editPart(workoutId, exercise, part, p => ({ ...p, ticks: p.reps.map((_, i) => (i === index ? !p.ticks[i] : !!p.ticks[i])) }))
  }

  function addPartSet(workoutId, exercise, part) {
    editPart(workoutId, exercise, part, p => ({ ...p, reps: [...p.reps, p.reps.at(-1)], ticks: [...p.ticks, false] }))
  }

  // A split card keeps at least one set; ✕ removes the card itself.
  function removePartSet(workoutId, exercise, part) {
    editPart(workoutId, exercise, part, p => (p.reps.length > 1 ? { ...p, reps: p.reps.slice(0, -1), ticks: p.ticks.slice(0, p.reps.length - 1) } : p))
  }

  // ✕ on a split card: its sets go back to the card above, at that card's
  // weight, ticks and all. The last split card going puts the main card back
  // to all its sets.
  function unsplit(workoutId, exercise, part) {
    update(s => {
      const sp = splitOf(s, workoutId, exercise)
      if (!sp?.parts[part]) return s
      const gone = sp.parts[part]
      if (part > 0) {
        return writeSplit(s, workoutId, exercise, () => ({
          ...sp,
          parts: sp.parts.flatMap((p, j) => (j === part ? [] : j === part - 1 ? [{ ...p, reps: [...p.reps, ...gone.reps], ticks: [...p.ticks, ...gone.ticks] }] : [p])),
        }))
      }
      // Back onto the main card: the sets it moved out get the card's ticks.
      const hidden = settingsOf(s, exercise).reps.map((_, i) => i).filter(i => i < sp.count && !sp.kept.includes(i))
      const ticked = writeTicks(s, workoutId, exercise, t => t.map((x, i) => {
        const k = hidden.indexOf(i)
        return k < 0 ? x : !!gone.ticks[k]
      }))
      const rest = sp.parts.slice(1)
      return writeSplit(ticked, workoutId, exercise, () => (rest.length ? { ...sp, count: 0, kept: [], parts: rest } : null))
    })
  }

  // Sets ticked out of all of a plan's sets, and how many exercises it has.
  // A built workout's empty slots count as sets to go (see openSlotsOf).
  function workoutProgress(workoutId) {
    let done = 0
    let total = SLOT_SETS * openSlotsOf(state, workoutId)
    const list = exercisesOf(state, workoutId)
    for (const ex of list) {
      const all = weekSetsOf(state, workoutId, ex)
      total += all.length
      done += all.filter(x => x.done).length
    }
    return { done, total, exercises: list.length }
  }

  // ── Exercise order per workout (remembered) ──────────────────────────────
  function getExercises(workoutId) {
    return exercisesOf(state, workoutId)
  }

  // The plan's two lists, and whether Core is on.
  function getExerciseSections(workoutId) {
    // (A past week can name an exercise of yours that's since been deleted.)
    const ex = section => listIds(state, workoutId, section).map(id => EXERCISE_BY_ID[id]).filter(Boolean)
    return { main: ex('main'), core: ex('core'), coreOn: coreOnOf(state, workoutId), coreInMain: coreInMain(workoutId) }
  }

  // Changes to what's in a plan take a scope: 'week' for just this week,
  // 'always' for this week and after (see writePlan in state.js).
  // A built workout is made fresh each time: its own list changes.
  const listScope = (workoutId, scope) => (workoutId === TARGETED.id ? 'always' : scope)

  function setCoreOn(workoutId, on, scope) {
    update(s => writeCoreOn(s, workoutId, on, scope))
  }

  // Adds to the main list or, for a core exercise, the Core section (and
  // turns Core on, for the same weeks).
  function addExercise(workoutId, id, scope) {
    update(s => {
      const ex = EXERCISE_BY_ID[id]
      const section = sectionOf(ex, workoutId)
      if (section === 'main' && !fitsPlan(ex, workoutId)) return s
      if (listIds(s, workoutId, section).includes(id)) return s
      const next = writeList(s, workoutId, section, ids => (ids.includes(id) ? ids : [...ids, id]), listScope(workoutId, scope))
      return section === 'core' ? writeCoreOn(next, workoutId, true, listScope(workoutId, scope)) : next
    })
  }

  // The main list always keeps at least one exercise; Core can be emptied.
  function removeExercise(workoutId, id, scope) {
    update(s => {
      const section = sectionOf(EXERCISE_BY_ID[id], workoutId)
      const ids = listIds(s, workoutId, section)
      if (section === 'main' && ids.length <= 1) return s
      const next = writeList(s, workoutId, section, list => (section === 'main' && list.length <= 1 ? list : list.filter(x => x !== id)), listScope(workoutId, scope))
      // Taking away the last core exercise turns the Core section off.
      return section === 'core' && ids.length === 1 && ids[0] === id ? writeCoreOn(next, workoutId, false, listScope(workoutId, scope)) : next
    })
  }

  // Moves an exercise to a place in its own list (main or Core), as when
  // dragged by its handle.
  function moveExerciseTo(workoutId, exerciseId, to) {
    update(s => {
      const section = sectionOf(EXERCISE_BY_ID[exerciseId], workoutId)
      const ids = listIds(s, workoutId, section).filter(id => id !== exerciseId)
      if (ids.length === listIds(s, workoutId, section).length) return s
      ids.splice(Math.max(0, Math.min(to, ids.length)), 0, exerciseId)
      return writeList(s, workoutId, section, () => ids, 'auto')
    })
  }

  // ── Warm-up per gym workout ──────────────────────────────────────────────
  // Off until you add it; then a timed warm-up of one or more sets heads the
  // workout.
  function getWarmup(workoutId) {
    return warmupOf(state, workoutId)
  }

  function writeWarmup(workoutId, change) {
    update(s => {
      const next = change(warmupOf(s, workoutId))
      return { ...s, warmups: { ...s.warmups, [workoutId]: { on: next.on, sets: next.sets } } }
    })
  }

  // Just for this week: each new week starts without one (see clearWeek).
  function addWarmup(workoutId) {
    writeWarmup(workoutId, w => ({ ...w, on: true }))
  }

  // Removing it also clears its tick, so its minutes leave the cardio bar.
  function removeWarmup(workoutId) {
    writeWarmup(workoutId, w => ({ ...w, on: false }))
    setWarmupDone(workoutId, false)
  }

  function setWarmupSet(workoutId, index, patch) {
    writeWarmup(workoutId, w => ({ ...w, sets: w.sets.map((x, i) => (i === index ? { ...x, ...patch } : x)) }))
  }

  // A new set starts like the last one.
  function addWarmupSet(workoutId) {
    writeWarmup(workoutId, w => ({ ...w, sets: [...w.sets, { ...w.sets.at(-1) }] }))
  }

  // There's always at least one set; to drop the last, remove the warm-up.
  function removeWarmupSet(workoutId, index) {
    writeWarmup(workoutId, w => (w.sets.length > 1 ? { ...w, sets: w.sets.filter((_, i) => i !== index) } : w))
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

  function addStretch(listId, id, scope) {
    update(s => {
      const ids = stretchesOf(s, listId).map(x => x.id)
      if (ids.includes(id) || !STRETCH_BY_ID[id]) return s
      return writeStretchList(s, listId, list => (list.includes(id) ? list : [...list, id]), listScope(listId, scope))
    })
  }

  // A list always keeps at least one stretch.
  function removeStretch(listId, id, scope) {
    update(s => {
      const ids = stretchesOf(s, listId).map(x => x.id)
      return ids.length <= 1 ? s : writeStretchList(s, listId, list => (list.length <= 1 ? list : list.filter(x => x !== id)), listScope(listId, scope))
    })
  }

  // ── A built workout's empty slots ───────────────────────────────────────
  function fillTargetedSlot(kind, index, id) {
    update(s => fillSlot(s, kind, index, id))
  }
  function dropTargetedSlot(kind, index) {
    update(s => dropSlot(s, kind, index))
  }
  function discard(id) {
    update(s => discardSession(s, id))
  }

  // ── This week against every week, and every week against the original ──
  function weekDiff(id) {
    return weekDiffOf(state, id)
  }
  function resetWeek(id) {
    update(s => resetWeekOf(s, id))
  }
  // Undoes taking one out just this week.
  function putBackWeek(id, kind, item) {
    update(s => putBackWeekOf(s, id, kind, item))
  }
  function defaultEdits(id) {
    return defaultEditsOf(state, id)
  }
  function restoreDefault(id) {
    update(s => restoreDefaultOf(s, id))
  }
  function undoDefaultEdit(id, kind, item) {
    update(s => undoDefaultEditOf(s, id, kind, item))
  }

  // Moves a stretch to a place in its list, as when dragged by its handle.
  function moveStretchTo(listId, id, to) {
    update(s => {
      const ids = stretchesOf(s, listId).map(x => x.id).filter(x => x !== id)
      ids.splice(Math.max(0, Math.min(to, ids.length)), 0, id)
      return writeStretchList(s, listId, () => ids, 'auto')
    })
  }

  // Ticks or unticks every hold at once.
  function toggleStretch(workoutId, id) {
    update(s => writeChecks(s, workoutId, cur => ({
      ...cur,
      stretches: { ...cur.stretches, [id]: !(cur.stretches?.[id] ?? false) },
      stretchHolds: { ...cur.stretchHolds, [id]: [] },
    })))
  }

  // Each of a stretch's `n` holds (sets × sides), ticked one by one. All of
  // them ticked is the stretch done.
  function getStretchHolds(workoutId, id, n) {
    const c = state.checks?.[workoutId]
    return Array.from({ length: n }, (_, i) => !!(c?.stretches?.[id] || c?.stretchHolds?.[id]?.[i]))
  }
  function toggleStretchHold(workoutId, id, i, n) {
    update(s => writeChecks(s, workoutId, cur => {
      const t = Array.from({ length: n }, (_, k) => !!(cur.stretches?.[id] || cur.stretchHolds?.[id]?.[k]))
      t[i] = !t[i]
      const all = t.every(Boolean)
      return { ...cur, stretches: { ...cur.stretches, [id]: all }, stretchHolds: { ...cur.stretchHolds, [id]: all ? [] : t } }
    }))
  }

  function removeActivity(id) {
    update(s => ({
      ...s,
      activities: { ...s.activities, [id]: Math.max(0, countOf(s, id) - 1) },
      ...(id === 'class'
        ? { classLog: classesOf(s).slice(0, -1) }
        : id === 'rest'
          ? { restLog: restDaysOf(s).slice(0, -1) }
          : { cardio: dropLastCardio(s.cardio ?? [], id) }),
    }))
  }

  // ── Classes ──────────────────────────────────────────────────────────────
  // Logs a class with your answers, and remembers them for the next one.
  function logClass(answers) {
    const { cardio, minutes, hard, strength, areas, stretch, stretchMinutes } = answers
    const entry = { at: answers.at ?? nowIso(), cardio, minutes, hard, strength, areas, stretch, stretchMinutes }
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

  // kind: 'walk', 'other' or 'sport'
  // `keep`: a sport you typed in joins your list (false: just this once).
  function editCardio(kind, index, patch, keep = true) {
    update(s => {
      const next = writeSessions(s, kind, sessionsOfKind(s, kind).map((x, i) => (i === index ? { ...x, ...patch } : x)))
      return kind === 'sport' && patch.type && keep ? rememberSport(next, patch.type) : next
    })
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

  // ── Rest days ─────────────────────────────────────────────────────────────
  function addRest(at = nowIso()) {
    update(s => {
      const list = [...restDaysOf(s), at]
      return { ...s, restLog: list, activities: { ...s.activities, rest: list.length } }
    })
  }

  // Moves a rest day to another day.
  function editRest(index, at) {
    update(s => ({ ...s, restLog: restDaysOf(s).map((x, i) => (i === index ? at : x)) }))
  }

  function deleteRest(index) {
    update(s => {
      const list = restDaysOf(s).filter((_, i) => i !== index)
      return { ...s, restLog: list, activities: { ...s.activities, rest: list.length } }
    })
  }

  // Puts a plan on a day: what's ticked moves there, and what's ticked next
  // goes there too.
  function setPlanDay(workoutId, at) {
    update(s => {
      const cur = s.checks?.[workoutId] ?? {}
      const moved = {
        ...cur,
        day: at,
        ...(cur.at && { at }),
        ...(cur.warmedAt && { warmedAt: at }),
        ...(cur.stretchStartAt && { stretchStartAt: at }),
        ...(cur.stretchedAt && { stretchedAt: at }),
        ...(cur.openedAt && { openedAt: at }),
      }
      return { ...s, checks: { ...s.checks, [workoutId]: moved } }
    })
  }

  // ── Doing it again (full-body days, the Full Body Stretch) ──────────────
  // Finished ones filed away, oldest first, each with its place in the log
  // (`index`) and whether it counted as a workout. See fileSession.
  const sessions = sessionsOf(state).map((x, index) => ({ ...x, index, counts: sessionCounts(x) }))

  // The one under way, as it would be filed, and whether it's finished.
  function currentSession(id) {
    const x = sessionOf(state, id)
    return { ...x, finished: finishedOf(state, id), counts: sessionCounts(x) }
  }

  // Files the finished one so a fresh one starts; a no-op if it isn't
  // finished, so the one under way just opens.
  // A card's sessions this week, each finished one on its own line, oldest
  // first: the filed ones (`filed`), then the newest of each, still open to
  // tick or untick.
  function sessionsFor(ids) {
    const filed = sessions.filter(x => ids.includes(x.id)).map(x => ({ ...x, filed: true }))
    const open = ids.map(currentSession).filter(x => x.finished)
    return [...filed, ...open].sort((a, b) => new Date(a.at) - new Date(b.at))
  }

  function startAgain(id) {
    update(s => fileSession(s, id))
  }

  // A full-body day begun from Build a Workout (see beginSession).
  function begin(id) {
    update(s => beginSession(s, id))
  }

  // A targeted workout for these areas, with this equipment (see
  // startTargeted).
  function startTargetedWorkout(areas, eq, muscles) {
    update(s => startTargeted(s, areas, eq, muscles))
  }


  // Opening a filed one again: see reopenOf and reopenSession.
  const canReopen = index => reopenOf(state, index)
  function reopen(index) {
    update(s => reopenSession(s, index))
  }

  // Logs the one under way as it stands, unfinished (see endSession). A
  // gym plan is marked ended where it is instead (see planEndedOf).
  function endEarly(id) {
    update(s => (REPEATABLE.has(id) ? endSession(s, id) : { ...s, checks: { ...s.checks, [id]: { ...s.checks?.[id], ended: true } } }))
  }

  // Deletes the open one of a kind: its ticks go, as if it weren't done.
  function clearSession(id) {
    update(s => {
      const checks = { ...s.checks }
      delete checks[id]
      return { ...s, checks }
    })
  }

  function moveSession(index, at) {
    update(s => ({ ...s, sessionLog: sessionsOf(s).map((x, i) => (i === index ? { ...x, at } : x)) }))
  }

  function deleteSession(index) {
    update(s => ({ ...s, sessionLog: sessionsOf(s).filter((_, i) => i !== index) }))
  }

  // A week's cardio sessions ({ kind, minutes, hard, type? }) for Trends:
  // this week's, or a saved week's when it kept its details (else null).
  function cardioLogOf(entry) {
    if (entry.live) return cardioSessionsOf(state)
    return entry.details ? cardioSessionsOf(weekStateOf(state, entry)) : null
  }

  // Which rest day falls on the day of `at`, or -1 if none does.
  function restIndexOn(at) {
    const day = new Date(at)
    return restDaysOf(state).findIndex(r => r && sameDay(new Date(r), day))
  }

  // When a plan's first set was ticked (`at`), its stretches finished
  // (`stretchedAt`) and its warm-up ticked (`warmedAt`), as ISO times, and
  // the day picked for it (`day`).
  function stampsOf(workoutId) {
    const { at, stretchedAt, warmedAt, day } = state.checks?.[workoutId] ?? {}
    return { at, stretchedAt, warmedAt, day }
  }

  function getNewClass() {
    return newClassOf(state)
  }

  // ── Cardio ───────────────────────────────────────────────────────────────
  function getCardioSetting(kind) {
    return cardioSettingOf(state, kind)
  }

  // Cardio that isn't a class or a walk — a run, a bike ride — logged with
  // its own minutes and effort.
  const otherCardio = (state.cardio ?? []).filter(x => x.kind === 'other')

  // Clock minutes logged this week for a kind (class, walk or other), and
  // as a label with what they count as (see cardioMinutes).
  function getCardioMinutes(kind) {
    return cardioSessionsOf(state).filter(x => x.kind === kind).reduce((n, x) => n + x.minutes, 0)
  }
  const cardioLabel = kind => cardioMinutes(cardioSessionsOf(state).filter(x => x.kind === kind))

  // A walk with its own length and effort; the next walk starts from these.
  function addWalk(minutes, hard, at = nowIso()) {
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

  // A run, ride, swim…: `type` is what it was. The next one starts from it.
  function addOtherCardio(minutes, hard, at = nowIso(), type) {
    update(s => ({
      ...s,
      cardio: [...(s.cardio ?? []), { kind: 'other', minutes, hard, at, ...(type && { type }) }],
      cardioSettings: { ...s.cardioSettings, other: { minutes, hard, ...(type && { type }) } },
    }))
  }

  function removeOtherCardio() {
    update(s => ({ ...s, cardio: dropLastCardio(s.cardio ?? [], 'other') }))
  }

  // ── Sports & hikes ───────────────────────────────────────────────────────
  // Logged like other cardio, with what you played or where you went.
  const sports = (state.cardio ?? []).filter(x => x.kind === 'sport')

  // `keep` false: a one-off (an adventure course, say) is logged with its
  // name but stays off your list, and the next sport doesn't start from it.
  function addSport(minutes, hard, at = nowIso(), type, keep = true) {
    update(s => {
      const next = {
        ...s,
        cardio: [...(s.cardio ?? []), { kind: 'sport', minutes, hard, at, type }],
        cardioSettings: { ...s.cardioSettings, sport: { minutes, hard, type: keep ? type : cardioSettingOf(s, 'sport').type } },
      }
      return keep ? rememberSport(next, type) : next
    })
  }

  // Puts a sport you typed in on your list (once; any capitals).
  function saveSport(name) {
    update(s => rememberSport(s, name))
  }

  // Takes a sport you typed in off your list. Sessions logged with it stay.
  function forgetSport(name) {
    update(s => ({ ...s, sportNames: (s.sportNames ?? []).filter(x => x !== name) }))
  }

  function removeSport() {
    update(s => ({ ...s, cardio: dropLastCardio(s.cardio ?? [], 'sport') }))
  }

  // Sports you typed in, each once and none that's already built in, whatever
  // the capitals (older saves or a restored backup could have repeats).
  const ownSports = (state.sportNames ?? []).filter((x, i, list) =>
    !SPORTS.some(b => b.toLowerCase() === x.toLowerCase()) && list.findIndex(y => y.toLowerCase() === x.toLowerCase()) === i)

  // Sports on your list, the last one you logged first (this week, then saved
  // weeks), for the sports picker's quick tiles.
  const recentSports = (() => {
    const names = [...SPORTS, ...ownSports]
    const logged = [state.cardio ?? [], ...(state.history ?? []).map(e => e.details?.cardio ?? [])]
      .flat()
      .filter(x => x.kind === 'sport' && x.type)
      .sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
      .map(x => names.find(n => n.toLowerCase() === x.type.toLowerCase()))
      .filter(Boolean)
    return [...new Set(logged)]
  })()

  // This week, computed the same way it's saved to history on reset.
  const week = weekOf(state)

  const stretchWeek = stretchWeekOf(state)
  const cardioWeek = cardioWeekOf(state)
  const classes = classesOf(state)

  // A stretch session on your own, with how long it was.
  function addOwnStretch(minutes, at = nowIso()) {
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

  const ownStretches = ownStretchesOf(state)
  const routineMinutes = Math.round(routineSecondsOf(state) / 60)
  const getListMinutes = listId => Math.round(routineSecondsOf(state, listId) / 60)




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

  // Switching to a barbell brings the weight up to the bar, at least.
  function setEquipment(exercise, equipment) {
    update(s => {
      const next = {
        ...s,
        equipment: { ...s.equipment, [exercise.id]: equipment },
        assist: { ...s.assist, [exercise.id]: equipment === 'assisted' },
      }
      return equipment === 'barbell' ? writeSettings(next, exercise, cur => ({ ...cur, weight: Math.max(cur.weight, cur.bar ?? 0) })) : next
    })
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

  // The Full Body Stretch's length in minutes.
  const getRoutineLength = () => routineLengthOf(state)
  function setRoutineLength(minutes) {
    update(s => ({ ...s, routineLength: minutes }))
  }

  function getStretchSets(stretchId, fallback = 1) {
    return state.stretchSets?.[stretchId] ?? fallback
  }

  function setStretchSets(stretchId, count) {
    update(s => ({ ...s, stretchSets: { ...s.stretchSets, [stretchId]: count } }))
  }

  function getStretchRest(stretchId, fallback = 20) {
    return state.stretchRest?.[stretchId] ?? fallback
  }

  function setStretchRest(stretchId, seconds) {
    update(s => ({ ...s, stretchRest: { ...s.stretchRest, [stretchId]: seconds } }))
  }

  return {
    getLog,
    getNumbers,
    setExerciseEdit,
    exerciseSnapshot,
    addCustomExercise,
    renameCustomExercise,
    deleteCustomExercise,
    saveCustomExercise,
    restoreExercise,
    addCustomStretch,
    renameCustomStretch,
    saveCustomStretch,
    deleteCustomStretch,
    setStretchEdit,
    stretchSnapshot,
    restoreStretch,
    setSetReps,
    setWeight,
    setBar,
    addSet,
    removeSet,
    toggleSet,
    toggleExercise,
    splitSets,
    setPartWeight,
    setPartReps,
    togglePartSet,
    addPartSet,
    removePartSet,
    unsplit,
    workoutProgress,
    planEnded: id => planEndedOf(state, id),
    getExercises,
    getExerciseSections,
    setCoreOn,
    addExercise,
    removeExercise,
    moveExerciseTo,
    getWarmup,
    addWarmup,
    removeWarmup,
    setWarmupSet,
    addWarmupSet,
    removeWarmupSet,
    getWarmupDone,
    setWarmupDone,
    getStretchDone,
    getStretches,
    weekDiff,
    fillTargetedSlot,
    discard,
    dropTargetedSlot,
    resetWeek,
    putBackWeek,
    defaultEdits,
    restoreDefault,
    undoDefaultEdit,
    addStretch,
    removeStretch,
    moveStretchTo,
    toggleStretch,
    getStretchHolds,
    toggleStretchHold,
    removeActivity,
    restDays: restDaysOf(state),
    addRest,
    editRest,
    deleteRest,
    restIndexOn,
    cardioLogOf,
    setPlanDay,
    stampsOf,
    sessions,
    currentSession,
    sessionsFor,
    startAgain,
    begin,
    targeted: targetedOf(state),
    startTargeted: startTargetedWorkout,
    planName: (id, session) => planName(state, id, session),
    canReopen,
    reopen,
    moveSession,
    clearSession,
    endEarly,
    deleteSession,
    dayLog: dayLogOf(state),
    goals: goalsOf(state),
    timer: timerOf(state),
    today: new Date(nowIso()),
    past: false,
    week,
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
    otherCardio,
    sports,
    addSport,
    removeSport,
    sportNames: [...SPORTS, ...ownSports],
    recentSports,
    ownSports,
    saveSport,
    forgetSport,
    walks,
    addWalk,
    getCardioMinutes,
    cardioLabel,
    addOtherCardio,
    removeOtherCardio,
    addOwnStretch,
    removeOwnStretch,
    ownStretches,
    lastOwnStretch: state.lastOwnStretch ?? 15,
    routineMinutes,
    getListMinutes,
    getSetup,
    setSetup,
    getEquipment,
    setEquipment,
    getCustomDuration,
    setCustomDuration,
    getPerSide,
    setPerSide,
    getStretchSets,
    getRoutineLength,
    setRoutineLength,
    setStretchSets,
    getStretchRest,
    setStretchRest,
  }
}

// `s` without your exercise `id`: out of the bank, its settings and every
// plan's lists.
function withoutCustom(s, id) {
  const drop = obj => {
    if (!obj?.[id]) return obj
    const rest = { ...obj }
    delete rest[id]
    return rest
  }
  const lists = obj => obj && Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, Array.isArray(v) ? v.filter(x => x !== id) : v]))
  return {
    ...s,
    customExercises: (s.customExercises ?? []).filter(c => c.id !== id),
    exerciseEdits: drop(s.exerciseEdits),
    exerciseSettings: drop(s.exerciseSettings),
    setup: drop(s.setup),
    equipment: drop(s.equipment),
    order: lists(s.order),
    coreLists: lists(s.coreLists),
    weekOnly: s.weekOnly && { ...s.weekOnly, order: lists(s.weekOnly.order), coreLists: lists(s.weekOnly.coreLists) },
  }
}

// Your own stretch gone: out of the bank, its settings, and every list.
function withoutCustomStretch(s, id) {
  const drop = obj => {
    if (!obj || !(id in obj)) return obj
    const rest = { ...obj }
    delete rest[id]
    return rest
  }
  const lists = obj => obj && Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, Array.isArray(v) ? v.filter(x => x !== id) : v]))
  return {
    ...s,
    customStretches: (s.customStretches ?? []).filter(c => c.id !== id),
    stretchEdits: drop(s.stretchEdits),
    customDurations: drop(s.customDurations),
    perSide: drop(s.perSide),
    stretchSets: drop(s.stretchSets),
    stretchRest: drop(s.stretchRest),
    stretchLists: lists(s.stretchLists),
    weekOnly: s.weekOnly && { ...s.weekOnly, stretchLists: lists(s.weekOnly.stretchLists) },
  }
}
