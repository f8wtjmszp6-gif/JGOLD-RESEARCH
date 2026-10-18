import { useState } from 'react'
import { SettingsSheet } from '../ui/Sheet'
import { sameDay } from '../../utils/days'
import { TAB_DOT, tabsOf } from '../../utils/dayKinds'
import Legend from './Legend'

const keyOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
// The Sunday a day's week starts on, as "YYYY-MM-DD".
function weekKey(d) {
  const s = new Date(d)
  s.setDate(s.getDate() - s.getDay())
  return keyOf(s)
}
const monthOf = d => new Date(d.getFullYear(), d.getMonth(), 1, 12)

// Picking a day opens its week with that day open. `weeks` is the app's
// weeks (saved ones and this one), `at` the one showing.
export default function CalendarSheet({ weeks, at, onPick, onClose }) {
  return (
    <SettingsSheet title="Jump to a week" closeLabel="Cancel" onClose={onClose}>
      <MonthGrid weeks={weeks} at={at} onPick={onPick} />
    </SettingsSheet>
  )
}

// A month at a time, Sunday first, starting on the month of `picked` (a day
// of the week showing, 0 = Sunday) or the week showing. Days in a week you
// have saved (or this week) can be tapped: onPick(week, day). Each shows a
// dot for every tab it covered, like the week strip. The week showing is
// shaded and `picked` circled. `compact`: just two weeks (this one and last,
// or the one showing and the one after), with an arrow under them for the
// whole month.
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
export function MonthGrid({ weeks, at, picked = null, compact = false, onPick }) {
  const [open, setOpen] = useState(!compact)
  const today = new Date()
  const byKey = Object.fromEntries(weeks.map(w => [w.weekStart, w]))
  const showing = weeks[at]?.weekStart
  const [month, setMonth] = useState(() => {
    if (!showing) return monthOf(today)
    const d = new Date(`${showing}T12:00:00`)
    d.setDate(d.getDate() + (picked ?? 0))
    return monthOf(d)
  })
  const first = weeks.find(w => w.dayLog || w.live) ?? weeks[0]
  const earliest = first ? monthOf(new Date(`${first.weekStart}T12:00:00`)) : monthOf(today)
  const thisMonth = monthOf(today)

  // Six rows of seven, starting on the Sunday on or before the 1st. Two
  // weeks ending on this one, or starting on the one showing, when folded.
  const live = weeks.find(w => w.live)?.weekStart
  const twoFrom = !showing ? null : showing === live ? addDays(new Date(`${live}T12:00:00`), -7) : new Date(`${showing}T12:00:00`)
  const folded = !open && twoFrom
  const start = folded ? twoFrom : new Date(month)
  if (!folded) start.setDate(1 - month.getDay())
  const cells = Array.from({ length: folded ? 14 : 42 }, (_, i) => addDays(start, i))
    .filter((d, i, all) => folded || i < 35 || all.slice(35).some(x => x.getMonth() === month.getMonth()))
  const label = folded
    ? [...new Set([cells[0], cells[13]].map(d => d.toLocaleDateString('en-US', { month: 'long' })))].join(' – ') + ` ${cells[13].getFullYear()}`
    : month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  // Unfolding opens the month of the day picked.
  const toggle = () => {
    if (!open && showing) setMonth(monthOf(addDays(new Date(`${showing}T12:00:00`), picked ?? 0)))
    setOpen(!open)
  }

  const step = n => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1, 12))
  const canBack = month > earliest
  const canNext = month < thisMonth

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={() => step(-1)} disabled={!canBack || folded} aria-label="Previous month" className={`w-9 h-9 rounded-lg flex items-center justify-center text-stone-500 active:bg-stone-100 ${folded ? 'disabled:opacity-0' : 'disabled:opacity-25'}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <p className="font-semibold text-stone-900">{label}</p>
        <button onClick={() => step(1)} disabled={!canNext || folded} aria-label="Next month" className={`w-9 h-9 rounded-lg flex items-center justify-center text-stone-500 active:bg-stone-100 ${folded ? 'disabled:opacity-0' : 'disabled:opacity-25'}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-stone-400">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map(d => {
          const key = weekKey(d)
          const week = byKey[key]
          const inMonth = folded || d.getMonth() === month.getMonth()
          const future = d > today && !sameDay(d, today)
          const open = !!week && !future
          const isToday = sameDay(d, today)
          const shaded = key === showing
          const circled = shaded && picked === d.getDay() && !isToday
          const items = week?.dayLog?.[d.getDay()] ?? []
          return (
            <button
              key={keyOf(d)}
              disabled={!open}
              onClick={() => onPick(week, d.getDay())}
              aria-label={`${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${open ? '' : ', nothing saved'}`}
              className={`flex flex-col items-center gap-0.5 py-1 transition-colors ${shaded ? 'bg-accent-50' : ''} ${
                d.getDay() === 0 ? 'rounded-l-xl' : d.getDay() === 6 ? 'rounded-r-xl' : ''
              } ${open ? 'active:bg-stone-100' : ''}`}
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm tabular-nums ${
                isToday ? 'bg-accent-500 text-white font-bold' : circled ? 'ring-2 ring-accent-500 text-accent-500 font-bold' : open ? (inMonth ? 'text-stone-900 font-semibold' : 'text-stone-400 font-semibold') : 'text-stone-300'
              }`}>
                {d.getDate()}
              </span>
              <span className="flex gap-0.5 h-1.5">
                {tabsOf(items).map(k => <span key={k} className={`w-1.5 h-1.5 rounded-full ${TAB_DOT[k]}`} />)}
              </span>
            </button>
          )
        })}
      </div>
      {compact && twoFrom && (
        <button onClick={toggle} aria-label={open ? 'Show two weeks' : 'Show the whole month'} aria-expanded={open} className="w-full -my-1 py-1 flex justify-center text-stone-400 rounded-lg active:bg-stone-100">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </button>
      )}
      <Legend />
    </div>
  )
}
