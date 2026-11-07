import { useState } from 'react'
import { InfoMark } from '../ui/InfoMark'
import { SettingsSheet } from '../ui/Sheet'
import { MonthGrid } from './CalendarSheet'
import { weekDays, sameDay } from '../../utils/days'
import { TABS } from '../../utils/dayKinds'

const firstDay = weekStart => {
  const [y, m, d] = weekStart.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}
const weekOf = days => `Week of ${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

// The picked day, opened from Activities on the week strip: the month on top
// to move around (always the same height, so switching days doesn't make
// it jump), then the day by tab. Show week view gives the whole week, day
// by day under the week's totals. `goals`: the weekly goals, for those
// totals. This week's lines can be tapped: onEdit(line.edit). Today, with
// nothing on it yet, can be marked as a rest day (onRest); earlier days with
// nothing on them are rest days already.
// It opens on `at` (a week) and `picked` (a day of it) and moves around on
// its own, so the screen behind stays where it was.
export default function DaySheet({ weeks, at: startAt, picked: startPicked, goals, onEdit, onRest, onClose }) {
  const [whole, setWhole] = useState(false)
  const [at, setAt] = useState(startAt)
  const [picked, setPicked] = useState(startPicked)
  // Under the title, a way back to today once you've moved off it.
  const live = weeks.findIndex(w => w.live)
  const now = new Date().getDay()
  const away = whole || at !== live || picked !== now
  const toToday = () => { setWhole(false); setAt(live); setPicked(now) }
  const week = weeks[at]
  const days = weekDays(firstDay(week.weekStart))
  const day = days[picked]
  const future = week.live && day > new Date() && !sameDay(day, new Date())
  const tap = week.live ? onEdit : null

  return (
    <SettingsSheet
      title={whole ? weekOf(days) : day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
      subtitle={live >= 0 && away ? (
        <button onClick={toToday} className="font-semibold text-accent-500 active:opacity-70">Go to today</button>
      ) : undefined}
      closeLabel="Done"
      split
      onClose={onClose}
    >
      <MonthGrid
        weeks={weeks}
        at={at}
        picked={picked}
        compact
        // On a day, a link to its week; on the week, how to get back to a
        // day.
        aside={whole ? (
          <span className="text-xs text-stone-400 whitespace-nowrap">Tap a day</span>
        ) : (
          <button onClick={() => setWhole(true)} className="text-xs font-semibold text-accent-500 whitespace-nowrap active:opacity-70">
            Show week view
          </button>
        )}
        onPick={(w, d) => {
          setWhole(false)
          setAt(weeks.indexOf(w))
          setPicked(d)
        }}
      />
      {/* Out to the sheet's right edge, so the scrollbar sits in the margin
          and not over the counts. */}
      <div data-scroll className="flex-1 min-h-0 overflow-y-auto overscroll-contain border-t border-stone-100 -ml-2 pl-2 -mr-5 pr-5">
        {whole ? (
          <WeekList
            dayLines={week.dayLines}
            days={days}
            empty={week.dayLines ? (week.live ? 'Nothing yet' : 'Nothing logged') : 'Not recorded'}
            totals={week.totals}
            goals={goals}
            onEdit={tap}
          />
        ) : (
          <DayList
            lines={week.dayLines?.[picked]}
            empty={future ? 'Nothing yet' : week.dayLines ? 'Nothing logged' : 'Not recorded'}
            onEdit={tap}
            onRest={week.live && sameDay(day, new Date()) ? onRest : null}
          />
        )}
      </div>
    </SettingsSheet>
  )
}

// One logged thing: a tick (or the stop sign if ended early, a ring if not
// finished) by its name, its count on the right, and the dumbbell after it
// where it counted as a workout. `dot`: its tab's color, for the week, where
// tabs mix.
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
// Each tab's week count, short enough for all four to share a line: just
// the number (cardio keeps its "min").
const weekCountOf = (tab, list, totals, goals) => {
  if (tab === 'gym') return towards(totals.workouts, goals?.workouts)
  if (tab === 'stretch') return towards(totals.stretch, goals?.stretch)
  if (tab === 'cardio' && totals.cardio != null) return <>{towards(totals.cardio, goals?.cardio)} min</>
  if (tab === 'rest') return <b className="font-semibold text-stone-700">{list.length}</b>
  return totalOf(tab, list)
}
// Tapping one (when `onEdit` is given) opens it or asks what to do with it.
function Line({ x, dot, onEdit }) {
  const tappable = !!(onEdit && x.edit)
  return (
    <div className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0 text-[15px] leading-snug">
      <InfoMark kind={x.status} />
      <button
        disabled={!tappable}
        onClick={() => onEdit(x.edit)}
        aria-label={tappable ? `Edit ${x.name}` : undefined}
        className="flex-1 min-w-0 flex items-center gap-2 text-left rounded-lg -my-1 py-1 -mx-1 px-1 enabled:active:bg-stone-100"
      >
        {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />}
        <span className="min-w-0 font-medium text-stone-900">{x.name}</span>
        <span className="ml-auto shrink-0 whitespace-nowrap text-sm text-stone-500">{x.right}</span>
      </button>
      {x.workout && <InfoMark kind="workout" />}
    </div>
  )
}

// The day by tab, in the tabs' colors: each tab's lines under what it added
// up to.
function DayList({ lines, empty, onEdit, onRest }) {
  const tabs = TABS.filter(([k]) => lines?.[k]?.length)
  if (!tabs.length) {
    return (
      <div className="pt-3 flex items-center justify-between gap-3">
        <p className="text-sm text-stone-400">{onRest ? 'Nothing yet' : empty}</p>
        {onRest && (
          <button onClick={onRest} className="text-sm font-semibold text-accent-500 active:opacity-70">Mark as rest day</button>
        )}
      </div>
    )
  }
  return (
    <div className="divide-y divide-stone-100 pt-3">
      {tabs.map(([k, label, dot]) => (
        <div key={k} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            {label}
            <span className="ml-auto normal-case tracking-normal font-medium text-stone-400">{totalOf(k, lines[k])}</span>
          </p>
          <div className="pl-3 divide-y divide-stone-100">
            {lines[k].map((x, j) => <Line key={j} x={x} onEdit={onEdit} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

// The week: how far along each goal is, then each day that had something,
// by name, with what you did in it (each with its tab's dot).
function WeekList({ dayLines, days, empty, totals, goals, onEdit }) {
  const tabs = TABS.filter(([k]) => dayLines?.some(d => d[k]?.length))
  const daysWith = (dayLines ?? []).map((d, i) => ({ i, lines: TABS.flatMap(([k, , dot]) => (d[k] ?? []).map(x => ({ x, dot }))) })).filter(d => d.lines.length)
  if (!daysWith.length) return <p className="pt-3 text-sm text-stone-400">{empty}</p>
  return (
    <div className="divide-y divide-stone-100 pt-3">
      <div className="flex justify-between gap-2 pb-3 text-[13px] text-stone-500 whitespace-nowrap">
        {tabs.map(([k, label, dot]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            {label}
            <span className="text-stone-400">{weekCountOf(k, dayLines.flatMap(d => d[k] ?? []), totals, goals)}</span>
          </span>
        ))}
      </div>
      {daysWith.map(({ i, lines }) => (
        <div key={i} className="py-3 last:pb-0 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            {days[i].toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
          <div className="divide-y divide-stone-100">
            {lines.map(({ x, dot }, j) => <Line key={j} x={x} dot={dot} onEdit={onEdit} />)}
          </div>
        </div>
      ))}
    </div>
  )
}
