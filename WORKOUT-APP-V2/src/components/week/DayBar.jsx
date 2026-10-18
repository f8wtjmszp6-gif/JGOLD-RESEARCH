import { useLayoutEffect, useRef, useState } from 'react'
import { TileIcon } from '../ui/Icons'
import { SettingsSheet } from '../ui/Sheet'
import { MonthGrid } from './CalendarSheet'
import { weekDays, sameDay } from '../../utils/days'
import { TAB_DOT, TILE, tabsOf } from '../../utils/dayKinds'

const firstDay = weekStart => {
  const [y, m, d] = weekStart.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}
const short = d => `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getDate()}`
const dotsOf = items => tabsOf(items).map(k => <span key={k} className={`w-1.5 h-1.5 rounded-full ${TAB_DOT[k]}`} />)

// The day tapped on the week strip, as a slim bar under it: the date and how
// many things were done, then what they were. Tap it for the whole
// day, with the month on top to move around (always the same height, so
// switching days doesn't make it jump).
export default function DayBar({ weeks, at, picked, onPick, onAt }) {
  const [open, setOpen] = useState(false)
  const week = weeks[at]
  const days = weekDays(firstDay(week.weekStart))
  const day = days[picked]
  const items = week.dayLog?.[picked] ?? []
  const future = week.live && day > new Date() && !sameDay(day, new Date())

  const one = items.length === 1 ? items[0] : null
  const title = items.length === 0 ? (future ? 'Nothing yet' : !week.dayLog ? 'Not recorded' : 'Nothing logged')
    : `${items.length} ${items.length === 1 ? 'Activity' : 'Activities'}`

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`${day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}: ${title}. Open the day`}
        className="w-full flex items-center gap-3 rounded-2xl bg-white px-3.5 py-3 text-left shadow-sm active:bg-stone-50"
      >
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${one ? TILE[one.kind] : 'bg-stone-100 text-stone-600'}`}>
          {one ? <TileIcon id={one.icon} size={20} /> : <span className="text-sm font-bold">{day.getDate()}</span>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-[15px] font-semibold text-stone-900">
            <span className="truncate">{short(day)} · {title}</span>
            <span className="flex gap-1 shrink-0">{dotsOf(items)}</span>
          </span>
          {items.length > 0 && <Names names={items.map(x => x.label)} />}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" className="text-stone-400 shrink-0" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
      </button>
      {open && (
        <SettingsSheet
          title={day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          closeLabel="Done"
          tall
          onClose={() => setOpen(false)}
        >
          <MonthGrid
            weeks={weeks}
            at={at}
            picked={picked}
            onPick={(w, d) => {
              onAt(weeks.indexOf(w))
              onPick(d)
            }}
          />
          <div className="border-t border-stone-100 pt-3">
            <DayList items={items} empty={title} />
          </div>
        </SettingsSheet>
      )}
    </>
  )
}

// What a day had, on one line: as many names as fit, then "+2 more" for
// the rest (tap the bar to see them all). Every way of cutting the list is
// measured off-screen and the longest one that fits is shown.
function Names({ names }) {
  const box = useRef(null)
  const probe = useRef(null)
  const [count, setCount] = useState(names.length)
  const options = names.map((_, i) => {
    const k = names.length - i
    return names.slice(0, k).join(' · ') + (k < names.length ? ` +${names.length - k} more` : '')
  })
  const key = names.join('|')
  useLayoutEffect(() => {
    const fit = () => {
      const width = box.current?.clientWidth ?? 0
      const widths = [...(probe.current?.children ?? [])].map(el => el.offsetWidth)
      const i = widths.findIndex(w => w <= width)
      setCount(names.length - (i < 0 ? names.length - 1 : i))
    }
    const watch = new ResizeObserver(fit)
    watch.observe(box.current)
    return () => watch.disconnect()
  }, [key, names.length])
  return (
    <span ref={box} className="relative block text-sm text-stone-500 truncate">
      {options[names.length - count]}
      <span ref={probe} aria-hidden="true" className="absolute left-0 top-0 invisible whitespace-nowrap pointer-events-none">
        {options.map(o => <span key={o} className="absolute left-0 top-0">{o}</span>)}
      </span>
    </span>
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
