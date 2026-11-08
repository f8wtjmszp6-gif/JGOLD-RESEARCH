import { useRef, useState } from 'react'
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
// shaded and `picked` circled. `compact`: just the week showing, with an
// arrow under it for the whole month, and arrows either side to move a week
// (onWeek(week, day), onPick unless given). `aside`: goes on the key's line,
// after a divider (as on the week strip). `big`: the month as a large
// title with boxed arrows beside it (then `extra`, if any), and the days
// set tighter.
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
export function MonthGrid({ weeks, at, picked = null, compact = false, big = false, extra, month: shownMonth, onMonth, aside, onPick, onWeek = onPick }) {
  const [open, setOpen] = useState(!compact)
  const today = new Date()
  const byKey = Object.fromEntries(weeks.map(w => [w.weekStart, w]))
  const showing = weeks[at]?.weekStart
  // The month showing is kept here, or by whoever passes `month` and
  // onMonth(month).
  const [ownMonth, setOwnMonth] = useState(() => {
    if (!showing) return monthOf(today)
    const d = new Date(`${showing}T12:00:00`)
    d.setDate(d.getDate() + (picked ?? 0))
    return monthOf(d)
  })
  const month = shownMonth ?? ownMonth
  const setMonth = onMonth ?? setOwnMonth
  const first = weeks.find(w => w.dayLog || w.live) ?? weeks[0]
  const earliest = first ? monthOf(new Date(`${first.weekStart}T12:00:00`)) : monthOf(today)
  const thisMonth = monthOf(today)

  // Six rows of seven, starting on the Sunday on or before the 1st; just
  // the week showing when folded.
  const weekFrom = showing ? new Date(`${showing}T12:00:00`) : null
  const folded = !open && weekFrom
  const start = folded ? weekFrom : new Date(month)
  if (!folded) start.setDate(1 - month.getDay())
  const cells = Array.from({ length: folded ? 7 : 42 }, (_, i) => addDays(start, i))
    .filter((d, i, all) => folded || i < 35 || all.slice(35).some(x => x.getMonth() === month.getMonth()))
  const label = folded
    ? [...new Set([cells[0], cells[6]].map(d => d.toLocaleDateString('en-US', { month: 'short' })))].join(' – ') + ` ${cells[6].getFullYear()}`
    : month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const liveShowing = folded && sameDay(addDays(weekFrom, today.getDay()), today)
  // Unfolding opens the month of the day picked.
  const toggle = () => {
    if (!open && showing) setMonth(monthOf(addDays(new Date(`${showing}T12:00:00`), picked ?? 0)))
    setOpen(!open)
  }

  // Folded, the arrows move a week (to the same weekday, but not past
  // today); open, a month.
  const weekBy = n => weekFrom && byKey[weekKey(addDays(weekFrom, 7 * n))]
  const step = n => {
    if (!folded) return setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1, 12))
    const w = weekBy(n)
    onWeek(w, w.live ? Math.min(picked ?? 0, today.getDay()) : picked ?? 0)
  }
  const canBack = folded ? !!weekBy(-1) : month > earliest
  const canNext = folded ? !!weekBy(1) : month < thisMonth

  // Swiping the days sideways steps the same way the arrows do: right for
  // earlier, left for later.
  const touch = useRef(null)
  const swipe = {
    onTouchStart: e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } },
    onTouchEnd: e => {
      const from = touch.current
      touch.current = null
      if (!from) return
      const dx = e.changedTouches[0].clientX - from.x
      const dy = e.changedTouches[0].clientY - from.y
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return
      if (dx > 0 ? canBack : canNext) step(dx > 0 ? -1 : 1)
    },
  }

  // Back and forward (a month, or folded a week) either side of the days,
  // halfway down, like the week strip on Today (each fades out at the end
  // it can't go past).
  const arrow = n => (
    <button
      onClick={() => step(n)}
      disabled={n < 0 ? !canBack : !canNext}
      aria-label={`${n < 0 ? 'Previous' : 'Next'} ${folded ? 'week' : 'month'}`}
      className="w-7 shrink-0 flex items-center justify-center text-stone-400 rounded-2xl active:bg-stone-100 disabled:opacity-0 transition-opacity"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d={n < 0 ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} /></svg>
    </button>
  )

  return (
    <div className={folded ? 'space-y-2' : 'space-y-3'}>
      {big ? (
        <div className="flex items-center justify-between gap-2">
          <h2 className="min-w-0 truncate text-[24px] min-[400px]:text-[30px] leading-tight font-bold tracking-tight text-stone-900">
            {month.toLocaleDateString('en-US', { month: 'long' })} <span className="font-semibold text-stone-400">{month.getFullYear()}</span>
          </h2>
          <div className="shrink-0 flex items-center gap-1">
            {[-1, 1].map(n => (
              <button
                key={n}
                onClick={() => step(n)}
                disabled={n < 0 ? !canBack : !canNext}
                aria-label={n < 0 ? 'Previous month' : 'Next month'}
                className="w-9 h-9 rounded-[10px] bg-stone-100 text-stone-600 disabled:text-stone-300 flex items-center justify-center active:bg-stone-200"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={n < 0 ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} /></svg>
              </button>
            ))}
            {extra}
          </div>
        </div>
      ) : folded ? (
        <p className="text-center text-xs font-bold tracking-wider text-stone-500 uppercase">{label}</p>
      ) : (
        <p className="text-center font-semibold text-stone-900">{label}</p>
      )}
      <div className="flex items-stretch">
      {!big && arrow(-1)}
      <div {...swipe} className={`touch-pan-y flex-1 min-w-0 ${folded ? 'space-y-1' : 'space-y-3'}`}>
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-stone-400">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className={(liveShowing || (big && sameDay(month, monthOf(today)))) && i === today.getDay() ? 'text-accent-500' : ''}>{d}</span>)}
      </div>
      <div className={`grid grid-cols-7 ${big ? 'gap-y-0.5' : 'gap-y-1'}`}>
        {cells.map(d => {
          const key = weekKey(d)
          const week = byKey[key]
          const inMonth = folded || d.getMonth() === month.getMonth()
          const future = d > today && !sameDay(d, today)
          const open = !!week && !future
          const isToday = sameDay(d, today)
          // The week showing is shaded in the month (one week alone needs
          // no shading, like the strip on Today).
          const inWeek = key === showing
          const shaded = inWeek && !folded
          const circled = inWeek && picked === d.getDay() && !isToday
          const items = week?.dayLog?.[d.getDay()] ?? []
          return (
            <button
              key={keyOf(d)}
              disabled={!open}
              onClick={() => onPick(week, d.getDay())}
              aria-label={`${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${open ? '' : ', nothing saved'}`}
              className={`flex flex-col items-center gap-0.5 ${big ? 'py-0.5' : 'py-1'} transition-colors ${shaded ? 'bg-accent-50' : ''} ${
                d.getDay() === 0 ? 'rounded-l-xl' : d.getDay() === 6 ? 'rounded-r-xl' : ''
              } ${open ? 'active:bg-stone-100' : ''}`}
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm tabular-nums ${
                isToday ? 'bg-accent-500 text-white font-bold' : circled ? 'ring-2 ring-accent-500 text-accent-500 font-bold' : open ? (inMonth ? 'text-stone-900 font-semibold' : 'text-stone-400 font-semibold') : 'text-stone-300'
              }`}>
                {d.getDate()}
              </span>
              <span className={`flex gap-0.5 ${big ? 'h-[5px]' : 'h-1.5'}`}>
                {tabsOf(items).map(k => <span key={k} className={`${big ? 'w-[5px] h-[5px]' : 'w-1.5 h-1.5'} rounded-full ${TAB_DOT[k]}`} />)}
              </span>
            </button>
          )
        })}
      </div>
      </div>
      {!big && arrow(1)}
      </div>
      {compact && weekFrom && (
        <button onClick={toggle} aria-label={open ? 'Show one week' : 'Show the whole month'} aria-expanded={open} className="w-full -my-1 py-1 flex justify-center text-stone-400 rounded-lg active:bg-stone-100">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </button>
      )}
      {aside ? (
        <div className="flex items-center">
          <div className="flex-1 min-w-0 flex justify-center px-2"><Legend /></div>
          <span className="w-px self-stretch bg-stone-200" />
          <div className="px-4">{aside}</div>
        </div>
      ) : <Legend />}
    </div>
  )
}
