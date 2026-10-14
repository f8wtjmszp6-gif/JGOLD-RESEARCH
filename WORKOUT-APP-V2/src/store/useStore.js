import { useCallback, useEffect, useState } from 'react'
import { SPORTS } from '../data/workout'
import { STRETCH_BY_ID, stretchFits } from '../data/stretches'
import { EXERCISE_BY_ID, fitsPlan } from '../data/exercises'
import { sameDay } from '../utils/days'
import { STORAGE_KEY, migrate, loadState, saveState } from './persist'
import { setupOf, settingsOf, equipmentOf, splitOf, weekSetsOf, writeSplit, writeSettings, writeChecks, dayLogOf, writeTicks, countOf, cardioSettingOf, classesOf, newClassOf, cardioSessionsOf, rememberSport, warmupOf, cardioWeekOf, sessionsOfKind, writeSessions, dropLastCardio, listIds, coreOnOf, exercisesOf, sectionOf, writeList, weekOf, restDaysOf, ownStretchesOf, stretchesOf, writeStretchList, routineSecondsOf, stretchWeekOf, timerOf, goalsOf } from './state'
import { summarize, weekStateOf, writeWeek, weeksOf, clearWeek, rollWeek, weekKeyOf, calendarWeekOf } from './weeks'

// The store every screen reads and changes: this week's state plus the
// functions that change it (see makeStore), saved on every change.
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
  function workoutProgress(workoutId) {
    let done = 0
    let total = 0
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
    const ex = section => listIds(state, workoutId, section).map(id => EXERCISE_BY_ID[id])
    return { main: ex('main'), core: ex('core'), coreOn: coreOnOf(state, workoutId) }
  }

  function setCoreOn(workoutId, on) {
    update(s => ({ ...s, coreOn: { ...s.coreOn, [workoutId]: on } }))
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
      const next = writeList(s, workoutId, section, ids.filter(x => x !== id))
      // Taking away the last core exercise turns the Core section off.
      return section === 'core' && ids.length === 1 && ids[0] === id
        ? { ...next, coreOn: { ...next.coreOn, [workoutId]: false } }
        : next
    })
  }

  // Moves an exercise to a place in its own list (main or Core), as when
  // dragged by its handle.
  function moveExerciseTo(workoutId, exerciseId, to) {
    update(s => {
      const section = sectionOf(EXERCISE_BY_ID[exerciseId])
      const ids = listIds(s, workoutId, section).filter(id => id !== exerciseId)
      if (ids.length === listIds(s, workoutId, section).length) return s
      ids.splice(Math.max(0, Math.min(to, ids.length)), 0, exerciseId)
      return writeList(s, workoutId, section, ids)
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

  // Moves a stretch to a place in its list, as when dragged by its handle.
  function moveStretchTo(listId, id, to) {
    update(s => {
      const ids = stretchesOf(s, listId).map(x => x.id).filter(x => x !== id)
      ids.splice(Math.max(0, Math.min(to, ids.length)), 0, id)
      return writeStretchList(s, listId, ids)
    })
  }

  function toggleStretch(workoutId, id) {
    update(s => writeChecks(s, workoutId, cur => ({
      ...cur,
      stretches: { ...cur.stretches, [id]: !(cur.stretches?.[id] ?? false) },
    })))
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
  function editCardio(kind, index, patch) {
    update(s => {
      const next = writeSessions(s, kind, sessionsOfKind(s, kind).map((x, i) => (i === index ? { ...x, ...patch } : x)))
      return kind === 'sport' && patch.type ? rememberSport(next, patch.type) : next
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

  // Which rest day falls on the day of `at`, or -1 if none does.
  function restIndexOn(at) {
    const day = new Date(at)
    return restDaysOf(state).findIndex(r => r && sameDay(new Date(r), day))
  }

  // When a plan's first set was ticked (`at`) and its stretches finished
  // (`stretchedAt`), as ISO times, or undefined.
  function stampsOf(workoutId) {
    const { at, stretchedAt } = state.checks?.[workoutId] ?? {}
    return { at, stretchedAt }
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

  // Clock minutes logged this week for a kind (class, walk or other).
  function getCardioMinutes(kind) {
    return cardioSessionsOf(state).filter(x => x.kind === kind).reduce((n, x) => n + x.minutes, 0)
  }

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

  function addSport(minutes, hard, at = nowIso(), type) {
    update(s => rememberSport({
      ...s,
      cardio: [...(s.cardio ?? []), { kind: 'sport', minutes, hard, at, type }],
      cardioSettings: { ...s.cardioSettings, sport: { minutes, hard, type } },
    }, type))
  }

  function removeSport() {
    update(s => ({ ...s, cardio: dropLastCardio(s.cardio ?? [], 'sport') }))
  }

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
    splitSets,
    setPartWeight,
    setPartReps,
    togglePartSet,
    addPartSet,
    removePartSet,
    unsplit,
    workoutProgress,
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
    addStretch,
    removeStretch,
    moveStretchTo,
    toggleStretch,
    removeActivity,
    restDays: restDaysOf(state),
    addRest,
    editRest,
    deleteRest,
    restIndexOn,
    stampsOf,
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
    sportNames: [...SPORTS, ...(state.sportNames ?? [])],
    walks,
    addWalk,
    getCardioMinutes,
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
    setStretchSets,
    getStretchRest,
    setStretchRest,
  }
}
