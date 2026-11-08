import { useState } from 'react'
import { InfoMark } from '../ui/InfoMark'
import { SettingsSheet } from '../ui/Sheet'
import { MonthGrid } from './CalendarSheet'
import { weekDays, sameDay } from '../../utils/days'
import { TABS, tabsOf } from '../../utils/dayKinds'

const firstDay = weekStart => {
  const [y, m, d] = weekStart.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}
const monthOf = d => new Date(d.getFullYear(), d.getMonth(), 1, 12)
const short = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const weekOf = days => `Week of ${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

// Activities, opened from the week strip: the month on top (swipe or the
// arrows for others), then Today, today by tab, or Week, a whole week day
// by day under its totals. Tapping a day in the month shows its week; only
// today opens on its own. `goals`: the weekly goals, for those totals. This
// week's lines can be tapped: onEdit(line.edit). Today, with nothing on it
// yet, can be marked as a rest day (onRest); earlier days with nothing on
// them are rest days already. With no week under way, Today shows `at` and
// `picked` instead.
export default function DaySheet({ weeks, at: startAt, picked: startPicked, goals, onEdit, onRest, onClose }) {
  const live = weeks.findIndex(w => w.live)
  const home = live >= 0 ? live : startAt
  const picked = live >= 0 ? new Date().getDay() : startPicked
  // Which tab: today, a week, or the month showing.
  const [view, setView] = useState('today')
  const whole = view === 'week'
  // The week Week shows.
  const [at, setAt] = useState(home)
  const homeDays = weekDays(firstDay(weeks[home].weekStart))
  const [month, setMonth] = useState(() => monthOf(homeDays[picked]))
  const week = weeks[whole ? at : home]
  const days = weekDays(firstDay(week.weekStart))
  const day = days[picked]
  const tap = week.live ? onEdit : null
  // The Week tab names the week it shows: This week, or its days.
  // (None picked yet, after turning to another month: Select a week.)
  const shown = at == null ? null : weekDays(firstDay(weeks[at].weekStart))
  const weekName = at == null ? 'Select a week' : weeks[at].live ? 'This week' : `${short(shown[0])} – ${short(shown[6])}`
  const openWeek = i => { setAt(i); setView('week') }
  // Turning the month shows it on the Month tab. The week tab then asks for
  // a week (tap a day for one), but for this month, which has this week.
  const turnMonth = m => {
    setAt(+m === +monthOf(homeDays[picked]) ? home : null)
    setMonth(m)
    setView('month')
  }
  // Looking at another week (or month), Today says Go to today.
  const away = (view === 'week' && at !== home) || (view === 'month' && +month !== +monthOf(homeDays[picked]))

  return (
    <SettingsSheet
      title={whole ? weekOf(days) : day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
      // The month is the header, Done by its arrows.
      bare
      split
      full
      onClose={onClose}
    >
      <MonthGrid
        weeks={weeks}
        // Today shades this week, Week the one it shows, Month none.
        at={view === 'week' ? at : view === 'today' ? home : -1}
        picked={view === 'today' ? picked : null}
        big
        month={month}
        onMonth={turnMonth}
        extra={<button onClick={onClose} className="h-9 px-3 rounded-[10px] bg-stone-100 text-sm font-semibold text-stone-600 active:bg-stone-200">Done</button>}
        onPick={w => openWeek(weeks.indexOf(w))}
      />
      <div className="flex gap-1.5 rounded-xl bg-stone-100 p-[3px]">
        {[['today', away ? 'Go to today' : 'Today'], ['week', weekName], ['month', month.toLocaleDateString('en-US', { month: 'long' })]].map(([v, name]) => (
          <button
            key={v}
            disabled={v === 'week' && at == null}
            onClick={() => {
              // Today also turns the month back to this one.
              if (v === 'today') { setAt(home); setMonth(monthOf(homeDays[picked])) }
              setView(v)
            }}
            aria-pressed={view === v}
            className={`flex-1 rounded-[9px] py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors ${view === v ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 disabled:text-stone-400 disabled:font-medium'}`}
          >
            {name}
          </button>
        ))}
      </div>
      {/* Out to the sheet's right edge, so the scrollbar sits in the margin
          and not over the counts. */}
      <div data-scroll className="flex-1 min-h-0 overflow-y-auto overscroll-contain border-t border-stone-100 -mx-5 px-5">
        {view === 'month' ? (
          <MonthList weeks={weeks} month={month} goals={goals} onWeek={openWeek} />
        ) : whole ? (
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
            empty={week.live ? 'Nothing yet' : week.dayLines ? 'Nothing logged' : 'Not recorded'}
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

// The month showing: how many of its days had gym, cardio, stretching or
// rest (as the dots show them), each with what it added up to (workouts,
// cardio minutes, stretches), then each of its weeks by days the same way,
// and whether it reached the workout goal. Tap a week to open it.
function MonthList({ weeks, month, goals, onWeek }) {
  const inMonth = d => d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear()
  const today = new Date()
  const rows = weeks
    .map((w, i) => ({ w, i, days: weekDays(firstDay(w.weekStart)) }))
    .filter(r => r.days.some(inMonth) && r.days[0] <= today)
  // Days with each tab, among those `keep` lets in.
  const daysOf = (list, keep) => {
    const n = Object.fromEntries(TABS.map(([k]) => [k, 0]))
    list.forEach(({ w, days }) => days.forEach((d, i) => {
      if (keep(d)) tabsOf(w.dayLog?.[i] ?? []).forEach(k => { n[k]++ })
    }))
    return n
  }
  const sum = daysOf(rows, inMonth)
  // What the month's days added up to: cardio as the week counts it (hard
  // minutes twice).
  const total = { gym: 0, cardio: 0, stretch: 0 }
  rows.forEach(({ w, days }) => days.forEach((d, i) => {
    const lines = w.dayLines?.[i]
    if (!lines || !inMonth(d)) return
    total.gym += TABS.flatMap(([k]) => lines[k] ?? []).filter(x => x.workout).length
    total.cardio += (lines.cardio ?? []).reduce((m, x) => m + (x.counted ?? x.minutes ?? 0), 0)
    total.stretch += (lines.stretch ?? []).filter(x => x.status === 'done').length
  }))
  const totalText = { gym: plural(total.gym, 'workout', 'workouts'), cardio: `${total.cardio} min`, stretch: plural(total.stretch, 'stretch', 'stretches') }
  const goal = goals?.workouts?.min
  if (!rows.length) return <p className="pt-3 text-sm text-stone-400">Nothing logged</p>
  return (
    <div className="pt-3 space-y-5">
      <div className="grid grid-cols-4 gap-2">
        {TABS.map(([k, label, dot]) => (
          <div key={k} className="min-w-0 rounded-2xl bg-stone-50 px-2 pt-2 pb-2.5">
            <p className="flex items-center gap-1.5 text-xs text-stone-500"><span className={`w-1.5 h-1.5 rounded-full ${dot}`} />{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-stone-900">{sum[k]}<span className="ml-1 text-[11px] font-medium text-stone-400">{sum[k] === 1 ? 'day' : 'days'}</span></p>
            <p className="text-[11px] text-stone-500 whitespace-nowrap">{totalText[k] ?? '\u00a0'}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="pb-1 text-xs font-semibold uppercase tracking-wider text-stone-500">Days each week</p>
        <div className="divide-y divide-stone-100">
          {rows.map(row => {
            const { w, i, days } = row
            const n = daysOf([row], () => true)
            const met = goal && w.totals.workouts >= goal
            return (
              <button key={w.weekStart} onClick={() => onWeek(i)} className="w-full flex items-center gap-3 py-2.5 text-left active:bg-stone-50">
                <span className="flex-1 min-w-0 text-[15px] text-stone-900">{w.live ? 'This week' : `${short(days[0])} – ${short(days[6])}`}</span>
                <span className="flex gap-2.5 text-[13px] tabular-nums text-stone-500">
                  {TABS.map(([k, , dot]) => (
                    <span key={k} className="flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${dot}`} />{n[k]}</span>
                  ))}
                </span>
                {goal ? (
                  <span className={`w-9 text-right text-sm font-bold tabular-nums ${met ? 'text-emerald-600' : w.live ? 'text-stone-400' : 'text-red-600'}`}>{met ? '✓' : `${w.totals.workouts}/${goal}`}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
