import { GYM_ORDER, FULL_BODY_BY_ID } from '../data/workout'
import { calendarWeekOf } from '../store/weeks'
import { weekDays } from './days'

// Which of the four plans a week covered: each one finished, all four on a
// finished full-body day, and the halves a class worked (upper: chest and
// back days, lower: both leg days).
const CLASS_PLANS = { upper: ['push', 'pull'], lower: ['legsQuad', 'legsPost'] }
function coveredBy(entry) {
  const finished = (entry.plans ?? []).filter(p => p.total > 0 && p.done >= p.total).map(p => p.id)
  if (finished.some(id => FULL_BODY_BY_ID[id])) return new Set(GYM_ORDER)
  const fromClasses = (entry.classes ?? []).filter(c => c.strength).flatMap(c => (c.areas ?? []).flatMap(a => CLASS_PLANS[a] ?? []))
  return new Set([...finished, ...fromClasses])
}

// The plan to do next, as { id, reason }, or null. It's one you haven't
// started this week: first what last week skipped, then what it left
// unfinished, then whatever was done longest ago. Nothing until there's a
// saved week to go on.
export function upNextOf(store, now = new Date()) {
  if (store.past || !store.history.length) return null
  const sunday = weekDays(now)[0]
  const weeksBack = entry => Math.round((sunday - new Date(`${calendarWeekOf(entry)}T12:00:00`)) / (7 * 86400000))

  // How many weeks back each plan was last covered: 0 is this week,
  // Infinity never.
  const lastDone = Object.fromEntries(GYM_ORDER.map(id => [id, Infinity]))
  for (const [entry, n] of [[store.current, 0], ...store.history.map(e => [e, weeksBack(e)])]) {
    for (const id of coveredBy(entry)) if (id in lastDone) lastDone[id] = Math.min(lastDone[id], n)
  }
  const started = new Set((store.current.plans ?? []).filter(p => p.done > 0).map(p => p.id))
  const open = GYM_ORDER.filter(id => lastDone[id] > 0 && !started.has(id))
  if (!open.length) return null

  // Skipped last week, then unfinished last week, then longest ago.
  const last = store.history.find(e => weeksBack(e) === 1)
  const rank = id => (!last || lastDone[id] === 1 ? 2 : last.plans?.find(p => p.id === id)?.done > 0 ? 1 : 0)
  const id = [...open].sort((a, b) => rank(a) - rank(b) || lastDone[b] - lastDone[a])[0]
  const r = rank(id)
  const reason = r === 0 ? 'Skipped last week'
    : r === 1 ? 'Not finished last week'
    : lastDone[id] === Infinity ? 'Not done yet'
    : lastDone[id] === 1 ? 'Last done last week'
    : `Last done ${lastDone[id]} weeks ago`
  return { id, reason, missed: r < 2 }
}
