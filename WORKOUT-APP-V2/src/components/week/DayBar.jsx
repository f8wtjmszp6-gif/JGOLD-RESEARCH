import { useRef, useState } from 'react'
import { TileIcon } from '../ui/Icons'
import { SettingsSheet } from '../ui/Sheet'
import { weekDays, sameDay, weekRange } from '../../utils/days'
import { TAB_DOT, TILE, tabsOf } from '../../utils/dayKinds'

const firstDay = weekStart => {
  const [y, m, d] = weekStart.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}
const short = d => `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getDate()}`
const dotsOf = items => tabsOf(items).map(k => <span key={k} className={`w-1.5 h-1.5 rounded-full ${TAB_DOT[k]}`} />)

// The day tapped on the week strip, as a slim bar at the bottom of the
// screen: one thing's name and details, or a busy day's count and what it
// was. It stays put while the page scrolls. Tap it for the whole day, with
// the week on top to move around (always the same height, so switching days
// doesn't make it jump); swipe it down (or tap the day again) to
// close it.
export default function DayBar({ weeks, at, picked, onPick, onAt }) {
  const [open, setOpen] = useState(false)
  const startY = useRef(null)
  const week = weeks[at]
  const days = weekDays(firstDay(week.weekStart))
  const day = days[picked]
  const items = week.dayLog?.[picked] ?? []
  const future = week.live && day > new Date() && !sameDay(day, new Date())

  const one = items.length === 1 ? items[0] : null
  const title = items.length === 0 ? (future ? 'Nothing yet' : !week.dayLog ? 'Not recorded' : 'Nothing logged')
    : one ? `${one.label}${one.detail?.includes('finished') ? ' ✓' : ''}`
    : `${items.length} things`
  const sub = one ? [one.detail?.replace(' · finished', ''), ...(one.tags ?? []).map(t => t.text)].filter(Boolean).join(' · ')
    : items.map(x => x.label).join(' · ')

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          onPointerDown={e => { startY.current = e.clientY }}
          onPointerUp={e => {
            // A swipe down closes it instead of opening.
            if (startY.current !== null && e.clientY - startY.current > 30) onPick(null)
            startY.current = null
          }}
          aria-label={`${day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}: ${title}. Open the day`}
          className="fixed inset-x-4 z-30 flex items-center gap-3 rounded-2xl bg-stone-800 text-white px-3.5 py-3 text-left shadow-xl active:bg-stone-900 touch-none"
          style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <span className="w-9 h-9 rounded-xl bg-stone-700 flex items-center justify-center shrink-0">
            {one ? <TileIcon id={one.icon} size={20} /> : <span className="text-sm font-bold">{day.getDate()}</span>}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-[15px] font-semibold">
              <span className="truncate">{short(day)} · {title}</span>
              <span className="flex gap-1 shrink-0">{dotsOf(items)}</span>
            </span>
            {sub && <span className="block text-sm text-stone-300 truncate">{sub}</span>}
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" className="text-stone-400 shrink-0" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
        </button>
      )}
      {open && (
        <SettingsSheet
          title={day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          closeLabel="Done"
          tall
          onClose={() => setOpen(false)}
        >
          <WeekNav weeks={weeks} at={at} days={days} picked={picked} onPick={onPick} onAt={onAt} />
          <div className="border-t border-stone-100 pt-3">
            <DayList items={items} empty={title} />
          </div>
        </SettingsSheet>
      )}
    </>
  )
}

// The week on top of the full day: ‹ › for the week before or after, and
// each day with its dots to switch to it. Days still to come can't be picked.
function WeekNav({ weeks, at, days, picked, onPick, onAt }) {
  const week = weeks[at]
  const now = new Date()
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <button onClick={() => onAt(at - 1)} disabled={at === 0} aria-label="Week before" className="w-9 h-9 rounded-lg flex items-center justify-center text-accent-500 active:bg-stone-100 disabled:opacity-25">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <p className="font-semibold text-stone-900">{weekRange(week.weekStart)}</p>
        <button onClick={() => onAt(at + 1)} disabled={at === weeks.length - 1} aria-label="Week after" className="w-9 h-9 rounded-lg flex items-center justify-center text-accent-500 active:bg-stone-100 disabled:opacity-25">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const isToday = sameDay(d, now)
          const later = d > now && !isToday
          return (
            <button
              key={i}
              disabled={later}
              onClick={() => onPick(i)}
              aria-pressed={picked === i}
              aria-label={d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              className="flex flex-col items-center gap-1 py-0.5 rounded-xl active:bg-stone-100 disabled:opacity-35"
            >
              <span className="text-[11px] font-semibold text-stone-400">{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold tabular-nums ${
                picked === i ? 'bg-accent-500 text-white' : isToday ? 'ring-2 ring-accent-500 text-accent-500' : 'text-stone-900'
              }`}>
                {d.getDate()}
              </span>
              <span className="flex gap-0.5 h-1.5">{dotsOf(week.dayLog?.[i] ?? [])}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// A row per session: its name, grey detail, and what it included (a plan's
// warm-up and stretches, a class's parts) as short lines, each with its
// tab's dot.
function DayList({ items, empty }) {
  if (!items.length) return <p className="text-sm text-stone-400">{empty}</p>
  return (
    <div className="divide-y divide-stone-100">
      {items.map((x, j) => (
        <div key={j} className={`flex gap-3 py-2.5 first:pt-0 last:pb-0 ${x.detail || x.tags?.length ? 'items-start' : 'items-center'}`}>
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TILE[x.kind]}`}>
            <TileIcon id={x.icon} size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-stone-900">{x.label}</span>
            {x.detail && <span className="block text-sm text-stone-500">{x.detail}</span>}
            {x.tags?.length > 0 && (
              <span className="block mt-1 pl-2.5 border-l-2 border-stone-100 space-y-0.5">
                {x.tags.map(t => (
                  <span key={t.text} className="flex items-center gap-2 text-sm text-stone-600">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TAB_DOT[t.kind === 'strength' ? 'gym' : t.kind]}`} />
                    {t.text}
                  </span>
                ))}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  )
}
