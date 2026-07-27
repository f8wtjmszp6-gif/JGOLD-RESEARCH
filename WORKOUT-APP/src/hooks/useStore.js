import { useState } from 'react'
import { schedule, LIFT_DAYS, ALL_DAYS } from '../data/workout'

const STORAGE_KEY = 'workout-tracker'

function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function getCalendarWeek(startDate) {
  if (!startDate) return 1
  const start = parseLocalDate(startDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffMs = today - start
  if (diffMs < 0) return 1
  return Math.min(12, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7)) + 1)
}

function clearDayCheckboxes(s) {
  const cleared = {}
  for (const day of ALL_DAYS) cleared[day] = {}
  return { ...s, ...cleared }
}

function processOnLoad(s) {
  if (!s.startDate) return s

  const calWeek = getCalendarWeek(s.startDate)
  // ackCalWeek = the calendar week we've already reconciled. This is tracked
  // separately from currentWeek so that choosing "Redo" (which keeps you on an
  // earlier week than the calendar) doesn't re-trigger the missed-days prompt on
  // every reload. For pre-existing saves without the field, treat the current
  // calendar week as already acknowledged so we never wipe their data on upgrade.
  const ack = s.ackCalWeek ?? calWeek

  // No new calendar week to reconcile — just make sure the baseline is persisted.
  if (calWeek <= ack || s.pendingMissedDays) {
    return s.ackCalWeek === undefined ? { ...s, ackCalWeek: calWeek } : s
  }

  // Calendar has moved into a new week — check if the current week was completed
  const curWeek = s.currentWeek ?? 1
  const completedDays = s.weeklyLog?.[curWeek]?.completedDays ?? []
  const allDone = LIFT_DAYS.every(d => completedDays.includes(d))
  const cleared = clearDayCheckboxes(s)

  if (allDone) {
    return { ...cleared, currentWeek: Math.min(12, curWeek + 1), ackCalWeek: calWeek }
  } else {
    return { ...cleared, pendingMissedDays: curWeek, ackCalWeek: calWeek }
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const s = raw ? JSON.parse(raw) : {}
    const processed = processOnLoad(s)
    // Persist load-time reconciliation so the acknowledged calendar week is
    // durable even before the user interacts.
    if (processed !== s) saveState(processed)
    return processed
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

  // ── Week ──────────────────────────────────────────────────────────────────
  const currentWeek = state.currentWeek ?? 1
  const startDate = state.startDate ?? null
  const pendingMissedDays = state.pendingMissedDays ?? null

  function setStartDate(date) {
    const week = getCalendarWeek(date)
    update(s => clearDayCheckboxes({
      ...s,
      startDate: date,
      currentWeek: week,
      ackCalWeek: week,
      weeklyLog: {},
      pendingMissedDays: null,
    }))
  }

  // User chose to redo the missed week — stay on same week, dismiss banner.
  // Acknowledge the current calendar week so the prompt doesn't fire again until
  // a further week passes.
  function redoWeek() {
    update(s => ({ ...s, pendingMissedDays: null, ackCalWeek: getCalendarWeek(s.startDate) }))
  }

  // User chose to continue despite missing days — advance one week
  function advanceWeek() {
    update(s => ({
      ...s,
      pendingMissedDays: null,
      ackCalWeek: getCalendarWeek(s.startDate),
      currentWeek: Math.min(12, (s.currentWeek ?? 1) + 1),
    }))
  }

  // Manual override from Program view
  function setWeek(week) {
    update(s => ({ ...s, currentWeek: week, pendingMissedDays: null }))
  }

  // ── Per-exercise weight settings ──────────────────────────────────────────
  // bar   – bar weight (0 = machine / no bar)
  // value – total weight lifted; plates per side = (value − bar) / 2
  // assist – "not lifting the full load" flag
  function getBar(exerciseId, defaultBar) {
    return state.bars?.[exerciseId] ?? defaultBar
  }

  function setBar(exerciseId, weight) {
    update(s => ({ ...s, bars: { ...s.bars, [exerciseId]: weight } }))
  }

  function getValue(exerciseId, defaultValue) {
    return state.values?.[exerciseId] ?? defaultValue
  }

  function setValue(exerciseId, value) {
    update(s => ({ ...s, values: { ...s.values, [exerciseId]: value } }))
  }

  function getAssist(exerciseId, defaultAssist) {
    return state.assist?.[exerciseId] ?? defaultAssist
  }

  function setAssist(exerciseId, isAssist) {
    update(s => ({ ...s, assist: { ...s.assist, [exerciseId]: isAssist } }))
  }

  // ── Restart ───────────────────────────────────────────────────────────────
  function restartProgram() {
    const today = new Date()
    const daysBack = today.getDay() === 0 ? 6 : today.getDay() - 1
    const monday = new Date(today)
    monday.setDate(today.getDate() - daysBack)
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    update(s => clearDayCheckboxes({
      ...s,
      startDate: fmt(monday),
      currentWeek: 1,
      ackCalWeek: 1,
      weeklyLog: {},
      pendingMissedDays: null,
    }))
  }

  // ── Day checks ────────────────────────────────────────────────────────────
  function getTodayKey() {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    return days[new Date().getDay()]
  }

  function getChecked(day, section, id) {
    return state[day]?.[section]?.[id] ?? false
  }

  function toggleChecked(day, section, id) {
    update(s => {
      const newValue = !(s[day]?.[section]?.[id] ?? false)
      const newSection = { ...s[day]?.[section], [id]: newValue }
      const newDay = { ...s[day], [section]: newSection }

      let weeklyLog = s.weeklyLog ?? {}

      // Track day completion for lift days (exercises only)
      if (section === 'exercises' && LIFT_DAYS.includes(day)) {
        const dayExercises = schedule[day]?.exercises ?? []
        const allDone = dayExercises.every(e =>
          e.id === id ? newValue : (s[day]?.exercises?.[e.id] ?? false)
        )
        const week = s.currentWeek ?? 1
        const existing = weeklyLog[week]?.completedDays ?? []
        const completedDays = allDone
          ? [...existing.filter(d => d !== day), day]
          : existing.filter(d => d !== day)
        weeklyLog = { ...weeklyLog, [week]: { ...weeklyLog[week], completedDays } }
      }

      return { ...s, [day]: newDay, weeklyLog }
    })
  }

  function clearDay(day) {
    update(s => {
      // Also remove from weekly completion log when resetting
      const week = s.currentWeek ?? 1
      const completedDays = (s.weeklyLog?.[week]?.completedDays ?? []).filter(d => d !== day)
      return {
        ...s,
        [day]: {},
        weeklyLog: { ...s.weeklyLog, [week]: { ...s.weeklyLog?.[week], completedDays } },
      }
    })
  }


  // ── Weekend day mode ('walk' | 'rest') ────────────────────────────────────
  // Persistent setting (does not reset weekly). Each weekend day is independent.
  function getWeekendMode(day) {
    return state.weekendModes?.[day] ?? (day === 'saturday' ? 'walk' : 'rest')
  }

  function setWeekendMode(day, mode) {
    update(s => ({ ...s, weekendModes: { ...s.weekendModes, [day]: mode } }))
  }

  // ── Custom durations (seconds) for timed exercises and stretches ──────────
  function getCustomDuration(itemId, defaultDuration) {
    return state.customDurations?.[itemId] ?? defaultDuration
  }

  function setCustomDuration(itemId, seconds) {
    update(s => ({ ...s, customDurations: { ...s.customDurations, [itemId]: seconds } }))
  }

  // ── Per-side override for stretches (true = hold each side, counts 2×) ───────
  function getPerSide(itemId, defaultPerSide) {
    return state.perSide?.[itemId] ?? defaultPerSide
  }

  function setPerSide(itemId, value) {
    update(s => ({ ...s, perSide: { ...s.perSide, [itemId]: value } }))
  }
  return {
    currentWeek,
    startDate,
    pendingMissedDays,
    setStartDate,
    redoWeek,
    advanceWeek,
    setWeek,
    getBar,
    setBar,
    getValue,
    setValue,
    getAssist,
    setAssist,
    getWeekendMode,
    setWeekendMode,
    restartProgram,
    getCustomDuration,
    setCustomDuration,
    getPerSide,
    setPerSide,
    getChecked,
    toggleChecked,
    clearDay,
    getTodayKey,
  }
}
