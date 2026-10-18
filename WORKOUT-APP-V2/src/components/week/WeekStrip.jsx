import { useLayoutEffect, useRef } from 'react'
import { weekDays, sameDay } from '../../utils/days'
import { TAB_DOT, tabsOf } from '../../utils/dayKinds'
import Legend from './Legend'


const firstDay = weekStart => {
  const [y, m, d] = weekStart.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

// Every week, Sunday to Saturday, one page each: swipe right for earlier weeks.
// Each date has a dot for everything done that day. Tap a day to show it in
// the bar under the strip (see DayBar). `weeks` is oldest first, ending with
// this week; `at` is the one showing; `picked` is the day shown (0 = Sunday).
export default function WeekStrip({ weeks, at, onAt, picked, onPick }) {
  const pager = useRef(null)
  const settle = useRef(null)
  const week = weeks[at]

  // Keeps the strip on the showing week when it's changed from outside
  // (Return to today, a new week starting); smooth unless it's the first time.
  const placed = useRef(false)
  // The week an arrow (or Return to today) is sliding to; until it gets there,
  // pauses in the slide aren't taken as a swipe coming to rest.
  const sliding = useRef(null)
  useLayoutEffect(() => {
    const el = pager.current
    const left = at * el.clientWidth
    if (Math.abs(el.scrollLeft - left) < 2) return
    const instant = !placed.current || matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!instant) sliding.current = at
    el.scrollTo({ left, behavior: instant ? 'auto' : 'smooth' })
    placed.current = true
  }, [at, weeks.length])


  // Once a swipe comes to rest, that week shows.
  function onScroll() {
    clearTimeout(settle.current)
    settle.current = setTimeout(() => {
      const el = pager.current
      if (!el) return
      const i = Math.round(el.scrollLeft / el.clientWidth)
      if (sliding.current !== null) {
        if (Math.abs(el.scrollLeft - sliding.current * el.clientWidth) < 2) sliding.current = null
        return
      }
      if (i !== at && weeks[i]) onAt(i)
    }, 90)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm">
      {/* Arrows either side show the days slide, and step a week at a time;
          each fades out at the end it can't go past. */}
      <div className="flex items-stretch">
        <Arrow label="Previous week" disabled={at === 0} onClick={() => onAt(at - 1)} />
        <div
          ref={pager}
          onScroll={onScroll}
          onPointerDown={() => { sliding.current = null }}
          className="flex-1 min-w-0 flex overflow-x-auto snap-x snap-mandatory overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Weeks, swipe for earlier ones"
        >
          {weeks.map((w, wi) => (
            <WeekPage
              key={w.weekStart}
              week={w}
              current={wi === at}
              picked={wi === at ? picked : null}
              onPick={onPick}
            />
          ))}
        </div>
        <Arrow label="Next week" right disabled={at === weeks.length - 1} onClick={() => onAt(at + 1)} />
      </div>
      {/* The key along the bottom. Weeks saved before days were kept have
          their totals only; a note takes its place. */}
      <div className="border-t border-stone-100 py-1.5">
        {!week.dayLog ? <p className="text-center text-[11px] text-stone-400">Days weren’t recorded this week</p> : <Legend />}
      </div>
    </div>
  )
}

function Arrow({ label, right, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-7 shrink-0 flex items-center justify-center text-stone-400 rounded-2xl active:bg-stone-100 disabled:opacity-0 transition-opacity"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d={right ? 'M9 18l6-6-6-6' : 'M15 18l-6-6 6-6'} />
      </svg>
    </button>
  )
}

// One week's seven days. Only this week has a today and days still to come.
function WeekPage({ week, current, picked, onPick }) {
  const now = new Date()
  const days = weekDays(firstDay(week.weekStart))
  const today = week.live ? days.findIndex(d => sameDay(d, now)) : 7
  return (
    <div className="w-full shrink-0 snap-center snap-always py-1.5" role="tablist" aria-hidden={!current}>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const items = week.dayLog?.[i] ?? []
          const isToday = i === today
          return (
            <button
              key={i}
              role="tab"
              tabIndex={current ? 0 : -1}
              aria-selected={picked === i}
              aria-label={`${d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}, ${items.length ? items.map(x => x.label).join(', ') : 'nothing logged'}`}
              onClick={() => onPick(i)}
              className={`flex flex-col items-center gap-1 py-0.5 rounded-xl active:bg-stone-100 ${i > today ? 'opacity-40' : ''}`}
            >
              <span className={`text-[11px] font-semibold ${isToday ? 'text-accent-500' : 'text-stone-400'}`}>
                {d.toLocaleDateString('en-US', { weekday: 'narrow' })}
              </span>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold tabular-nums ${
                isToday ? 'bg-accent-500 text-white' : picked === i ? 'ring-2 ring-accent-500 text-accent-500' : 'text-stone-900'
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
    </div>
  )
}
