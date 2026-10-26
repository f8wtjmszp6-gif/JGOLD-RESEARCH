import { useLayoutEffect, useRef, useState } from 'react'
import { TileIcon, WorkoutMark, EarlyMark, DoneMark, OpenMark } from '../ui/Icons'
import { SettingsSheet } from '../ui/Sheet'
import { MonthGrid } from './CalendarSheet'
import { weekDays, sameDay } from '../../utils/days'
import { TABS, TAB_DOT, TILE, tabsOf } from '../../utils/dayKinds'

const firstDay = weekStart => {
  const [y, m, d] = weekStart.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}
const weekOf = days => `Week of ${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
const rangeOf = days => {
  const [a, b] = [days[0], days[6]]
  const md = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return a.getMonth() === b.getMonth() ? `${md(a)} – ${b.getDate()}` : `${md(a)} – ${md(b)}`
}
const short = d => `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getDate()}`
const dotsOf = items => tabsOf(items).map(k => <span key={k} className={`w-1.5 h-1.5 rounded-full ${TAB_DOT[k]}`} />)

// The day tapped on the week strip, as a slim bar under it: the date and how
// many things were done, then what they were. Tap it for the whole
// day, with the month on top to move around (always the same height, so
// switching days doesn't make it jump), then the whole week with the day
// shaded and the rest faded. Tap the day again for the week with nothing
// faded. `goals`: the weekly goals, for the week's totals.
export default function DayBar({ weeks, at, picked, onPick, onAt, goals }) {
  const [open, setOpen] = useState(false)
  const [whole, setWhole] = useState(false)
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
        onClick={() => {
          setWhole(false)
          setOpen(true)
        }}
        aria-label={`${day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}: ${title}. Open the day`}
        className="w-full flex items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5 text-left shadow-sm active:bg-stone-50"
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
          title={whole ? weekOf(days) : day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          subtitle={whole ? rangeOf(days) : weekOf(days)}
          closeLabel="Done"
          split
          onClose={() => setOpen(false)}
        >
          <MonthGrid
            weeks={weeks}
            at={at}
            picked={picked}
            compact
            onPick={(w, d) => {
              setWhole(!whole && w.weekStart === week.weekStart && d === picked)
              onAt(weeks.indexOf(w))
              onPick(d)
            }}
          />
          <p className="-mt-2 text-center text-xs text-stone-400">
            {whole ? 'Tap a day to shade it' : `Tap ${short(day).split(' ')[0]} again for the whole week`}
          </p>
          <div data-scroll className="flex-1 min-h-0 overflow-y-auto overscroll-contain border-t border-stone-100 -mx-2 px-2">
            <DayList
              lines={weekLinesOf(week.dayLines, days)}
              focus={whole ? null : picked}
              empty={week.dayLines ? (week.live ? 'Nothing yet' : 'Nothing logged') : 'Not recorded'}
              totals={week.totals}
              goals={goals}
            />
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

// The whole week by tab: every day's lines in order, each with its day.
const weekLinesOf = (dayLines, days) => dayLines && Object.fromEntries(TABS.map(([k]) => [k,
  dayLines.flatMap((d, i) => (d[k] ?? []).map(x => ({ ...x, i, day: days[i].toLocaleDateString('en-US', { weekday: 'short' }) })))]))

// The day (or week) by tab, in the tabs' colors: each tab's lines with what
// it added up to (for the week, how far along its goal is), a tick (or the stop sign if ended early, a ring if not
// finished) by each name, its count on the right, and the dumbbell after
// it where it counted as a workout.
const MARK = { done: DoneMark, early: EarlyMark, open: OpenMark }
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const totalOf = (tab, list) => {
  if (tab === 'gym') { const n = list.filter(x => x.workout).length; return n ? plural(n, 'workout', 'workouts') : '' }
  if (tab === 'stretch') { const n = list.filter(x => x.status === 'done').length; return n ? plural(n, 'stretch', 'stretches') : '' }
  if (tab === 'cardio') {
    const real = list.reduce((m, x) => m + x.minutes, 0), counted = list.reduce((m, x) => m + x.counted, 0)
    return counted > real ? `${real}/${counted} min` : `${real} min`
  }
  return ''
}
// The week's count toward a goal: "2/3" until it's reached, then just "4".
const towards = (n, goal) => <><b className="font-semibold text-stone-700">{n}</b>{goal && n < goal.min ? `/${goal.min}` : ''}</>
const weekTotalOf = (tab, list, totals, goals) => {
  if (tab === 'gym') return <>{towards(totals.workouts, goals?.workouts)} {totals.workouts === 1 && !(goals?.workouts.min > 1) ? 'workout' : 'workouts'}</>
  if (tab === 'stretch') return <>{towards(totals.stretch, goals?.stretch)} {totals.stretch === 1 && !(goals?.stretch.min > 1) ? 'day' : 'days'}</>
  if (tab === 'cardio' && totals.cardio != null) return <>{towards(totals.cardio, goals?.cardio)} min</>
  if (tab === 'rest') return plural(list.length, 'day', 'days')
  return totalOf(tab, list)
}
// `focus`: the day to shade, the rest faded (null: nothing faded).
function DayList({ lines, empty, totals, goals, focus }) {
  const tabs = TABS.filter(([k]) => lines?.[k]?.length)
  if (!tabs.length) return <p className="pt-3 text-sm text-stone-400">{empty}</p>
  return (
    <div className="divide-y divide-stone-100 pt-3">
      {tabs.map(([k, label, dot]) => (
        <div key={k} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            {label}
            <span className="ml-auto normal-case tracking-normal font-medium text-stone-400">{totals ? weekTotalOf(k, lines[k], totals, goals) : totalOf(k, lines[k])}</span>
          </p>
          <div className="pl-3 divide-y divide-stone-100">
            {lines[k].map((x, j) => {
              const Mark = MARK[x.status]
              return (
                <div
                  key={j}
                  className={`flex items-center gap-2 py-1.5 text-[15px] leading-snug transition-opacity ${
                    focus == null ? 'first:pt-0 last:pb-0' : x.i === focus ? 'bg-accent-50 rounded-lg -mx-2 px-2 border-transparent' : 'opacity-30 first:pt-0 last:pb-0'
                  }`}
                >
                  <Mark />
                  {x.day && <span className="w-8 shrink-0 text-[13px] font-semibold text-stone-500">{x.day}</span>}
                  <span className="min-w-0 font-medium text-stone-900">{x.name}</span>
                  <span className="ml-auto shrink-0 whitespace-nowrap text-sm text-stone-500">{x.right}</span>
                  {x.workout && <WorkoutMark />}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
