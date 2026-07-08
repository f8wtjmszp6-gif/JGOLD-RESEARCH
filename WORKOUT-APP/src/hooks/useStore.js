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
  const curWeek = s.currentWeek ?? 1

  // Already handled or same week
  if (calWeek <= curWeek || s.pendingMissedDays) return s

  // Calendar has moved ahead — check if last week was completed
  const completedDays = s.weeklyLog?.[curWeek]?.completedDays ?? []
  const allDone = LIFT_DAYS.every(d => completedDays.includes(d))
  const cleared = clearDayCheckboxes(s)

  if (allDone) {
    return { ...cleared, currentWeek: Math.min(12, curWeek + 1) }
  } else {
    return { ...cleared, pendingMissedDays: curWeek }
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const s = raw ? JSON.parse(raw) : {}
    return processOnLoad(s)
  } catch {
    return {}
  }
}

function saveState(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {}
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
      weeklyLog: {},
      pendingMissedDays: null,
    }))
  }

  // User chose to redo the missed week — stay on same week, dismiss banner
  function redoWeek() {
    update(s => ({ ...s, pendingMissedDays: null }))
  }

  // User chose to continue despite missing days — advance one week
  function advanceWeek() {
    update(s => ({
      ...s,
      pendingMissedDays: null,
      currentWeek: Math.min(12, (s.currentWeek ?? 1) + 1),
    }))
  }

  // Manual override from Program view
  function setWeek(week) {
    update(s => ({ ...s, currentWeek: week, pendingMissedDays: null }))
  }

  // ── Bar weights ───────────────────────────────────────────────────────────
  function getBarWeight(exerciseId, defaultBar) {
    return state.barWeights?.[exerciseId] ?? defaultBar
  }

  function setBarWeight(exerciseId, weight) {
    update(s => ({ ...s, barWeights: { ...s.barWeights, [exerciseId]: weight } }))
  }

  // ── Custom exercise weights ───────────────────────────────────────────────
  // For barbell: stored value is total weight (number). Plate weight = total - bar.
  // For non-barbell: stored value is the display string (e.g. "25 lbs assist").
  function getCustomWeight(exerciseId) {
    return state.customWeights?.[exerciseId] ?? null
  }

  function setCustomWeight(exerciseId, value) {
    update(s => ({ ...s, customWeights: { ...s.customWeights, [exerciseId]: value } }))
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


  // ── Bodyweight mode per exercise ─────────────────────────────────────────
  // true = bodyweight, false = add-weight mode
  function getBodyweightMode(exerciseId, defaultIsBW) {
    const stored = state.bodyweightModes?.[exerciseId]
    return stored === undefined ? defaultIsBW : stored
  }

  function setBodyweightMode(exerciseId, isBW) {
    update(s => ({ ...s, bodyweightModes: { ...s.bodyweightModes, [exerciseId]: isBW } }))
  }

  // ── Custom durations (seconds) for timed exercises and stretches ──────────
  function getCustomDuration(itemId, defaultDuration) {
    return state.customDurations?.[itemId] ?? defaultDuration
  }

  function setCustomDuration(itemId, seconds) {
    update(s => ({ ...s, customDurations: { ...s.customDurations, [itemId]: seconds } }))
  }
  return {
    currentWeek,
    startDate,
    pendingMissedDays,
    setStartDate,
    redoWeek,
    advanceWeek,
    setWeek,
    getBarWeight,
    setBarWeight,
    getCustomWeight,
    setCustomWeight,
    restartProgram,
    getBodyweightMode,
    setBodyweightMode,
    getCustomDuration,
    setCustomDuration,
    getChecked,
    toggleChecked,
    clearDay,
    getTodayKey,
  }
}
