import { Fragment, useState } from 'react'
import { workouts, GYM_ORDER } from '../../data/workout'
import { calendarWeekOf } from '../../store/weeks'
import { goalLevel } from '../../utils/goal'
import { EXERCISE_BANK, EXERCISE_BY_ID, primaryOf } from '../../data/exercises'
import { metric } from '../../utils/lifts'
import CardioTrends from './CardioTrends'
import { SettingsSheet } from '../ui/Sheet'

const WEEKS = 12

// Strength tabs: each body area and the bank's muscle groups in it.
const AREAS = [
  ['upper', 'Upper', ['chest', 'back', 'shoulders', 'arms']],
  ['legs', 'Legs', ['legs']],
  ['core', 'Core', ['core']],
]

// The headings in each tab, and what goes under them: upper body by muscle
// group, legs and core by the muscle a lift mainly works (inner thighs with
// quads, outer thighs with glutes, as Build a Workout pairs them).
const SECTIONS = {
  upper: [['Chest', ex => ex.group === 'chest'], ['Back', ex => ex.group === 'back'],
    ['Shoulders', ex => ex.group === 'shoulders'], ['Arms', ex => ex.group === 'arms']],
  legs: [['Quads', ex => ['quads', 'inner-thighs'].includes(primaryOf(ex)[0])],
    ['Glutes', ex => ['glutes', 'outer-thighs'].includes(primaryOf(ex)[0])],
    ['Hamstrings', ex => primaryOf(ex)[0] === 'hamstrings'], ['Calves', ex => primaryOf(ex)[0] === 'calves']],
  core: [['Abs', ex => primaryOf(ex)[0] !== 'obliques'], ['Obliques', ex => primaryOf(ex)[0] === 'obliques']],
}

// `list` under its tab's headings, each lift once (anything that fits none
// goes under the last), empty headings left out.
function sectioned(tabId, list) {
  const secs = SECTIONS[tabId]
  const at = ex => { const i = secs.findIndex(([, fits]) => fits(ex)); return i < 0 ? secs.length - 1 : i }
  return secs.map(([label], i) => [label, list.filter(ex => at(ex) === i)]).filter(([, l]) => l.length)
}

const DAY = 86400000

// "YYYY-MM-DD" Sunday → Date, and back.
const toDate = key => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d) }
const toKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const short = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

// The last 12 calendar weeks up to this one (so far), oldest first, or `count`
// of them. A week with nothing saved is a gap (null), so the grid keeps real
// time; weeks from before anything was saved are left off unless `all`.
function lastWeeks(history, current, count = WEEKS, all = false) {
  const byWeek = Object.fromEntries([...history, current].map(w => [calendarWeekOf(w), w]))
  const newest = toDate(current.weekStart)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(newest.getTime() - (count - 1 - i) * 7 * DAY)
    d.setHours(12)
    return { start: d, entry: byWeek[toKey(d)] ?? null }
  }).filter((w, i, list) => all || w.entry || list.slice(0, i).some(x => x.entry))
}


// The Trends screen: its own page off the header, like Past weeks.
export default function TrendsScreen({ store, onBack }) {
  const past = lastWeeks(store.history, store.current).length - 1
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-4 bg-stone-50 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Trends</h1>
          <button onClick={onBack} className="shrink-0 h-9 px-3 rounded-[10px] bg-stone-100 text-sm font-semibold text-stone-600 active:bg-stone-200">Done</button>
        </div>
        {/* What the week grid shows, said once here. */}
        <p className="text-stone-400 text-sm mt-1">Last {past} {past === 1 ? 'week' : 'weeks'} and this week so far · ✓ goal met</p>
      </div>
      <Trends store={store} />
    </div>
  )
}

function Trends({ store }) {
  const weeks = lastWeeks(store.history, store.current)
  const [view, setView] = useState('strength')
  const [tabId, setTabId] = useState('upper')
  // Lifts by body area: upper body (chest, back, shoulders, arms), legs and
  // core. Only lifts with sets saved show, in the bank's order, and only
  // ones done with weight the last time, where the goal is more: not
  // assisted (less help is better), timed or reps alone.
  const saved = [store.current, ...store.history]
  const charted = id => {
    const m = metric(saved.find(w => w.lifts?.[id])?.lifts[id])
    return m?.unit === 'lb' && !m.assist
  }
  const tabs = AREAS.map(([id, label, groups]) => ({
    id,
    label,
    name: label,
    ids: EXERCISE_BANK.filter(x => groups.includes(x.group) && charted(x.id)).map(x => x.id),
  }))
  const tab = tabs.find(t => t.id === tabId) ?? tabs[0]
  // Each lift's heaviest ever, from every week saved.
  const bestOf = id => Math.max(0, ...saved.map(w => metric(w.lifts?.[id])).filter(m => m?.unit === 'lb' && !m.assist).map(m => m.v))
  const shown = tab.ids.map(id => EXERCISE_BY_ID[id])

  return (
    <>
      {/* The goal grid and the switch stay put; what's under them scrolls. */}
      <div className="px-5 shrink-0 bg-stone-50">
      <WeekGrid weeks={lastWeeks(store.history, store.current, WEEKS + 1, true)} goals={store.goals} />

      {/* Strength or cardio, one at a time. */}
      <div className="bg-stone-100 rounded-xl p-1 flex mt-4 mb-3" role="tablist" aria-label="Trends for">
        {[['strength', 'Strength'], ['cardio', 'Cardio']].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${view === id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`}
          >
            {label}
          </button>
        ))}
      </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6">
      {view === 'strength' ? <>
        {/* The plan tiles scroll away; the area tabs stick at the top. */}
        <Balance weeks={weeks} />
        <div className="sticky top-0 z-10 bg-stone-50 pb-3">
          <div className="bg-stone-100 rounded-xl p-1 grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTabId(t.id)}
                aria-label={t.name}
                className={`py-1.5 rounded-lg text-[11px] font-semibold truncate transition-colors ${
                  tab.id === t.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {/* One exercise per row. */}
        {shown.length === 0 && (
          <p className="bg-white shadow-sm rounded-2xl p-4 text-sm text-stone-400">No {tab.name.toLowerCase()} lifts saved yet. They show here once you tick them.</p>
        )}
        {/* Each tab's lifts under headings by muscle. */}
        <div className="space-y-4">
          {sectioned(tab.id, shown).map(([label, list]) => (
            <section key={label} className="space-y-2">
              <h3 className="px-1 text-xs uppercase tracking-wider font-medium text-stone-400">{label}</h3>
              {list.map(ex => (
                <ExerciseTrend key={ex.id} exercise={ex} weeks={weeks} best={bestOf(ex.id)} />
              ))}
            </section>
          ))}
        </div>

      </> : (
        <CardioTrends weeks={lastWeeks(store.history, store.current, WEEKS + 1, true)} goal={store.goals.cardio} logOf={store.cardioLogOf} />
      )}
      </div>

    </>
  )
}

// One square per week for workouts and for stretching, greener toward the
// 3–4 goal, ✓ when met. Same green ramp as the This week card.
const LEVELS = [
  'bg-stone-100',
  'bg-emerald-200',
  'bg-emerald-300',
  'bg-emerald-500',
  'bg-emerald-700',
]
function WeekGrid({ weeks, goals }) {
  const workouts = w => w.week.gym + w.week.class + (w.week.cardio ?? 0) + (w.week.stretchWork ?? 0)
  // Each row as a level toward your goal (3 = met), and what it was.
  const rows = [
    ['Workouts', w => goalLevel(workouts(w), goals.workouts), workouts],
    ['Stretching', w => goalLevel(w.stretch.total, goals.stretch), w => w.stretch.total],
    ['Cardio', w => (w.cardio ? goalLevel(w.cardio.total, goals.cardio) : 0), w => (w.cardio ? `${w.cardio.total} min` : 'not tracked')],
  ]
  // Equal week columns, with a little room before this week's so its dashed
  // outline clears the week before.
  const COLUMNS = `repeat(${weeks.length - 1}, minmax(0, 1fr)) 4px minmax(0, 1fr)`
  const spacer = <span aria-hidden="true" />
  return (
    <div className="bg-white shadow-sm rounded-2xl px-4 py-3.5">
      {/* Laid out by week: the labels, then a column of three boxes per week.
          This week is still going, so its column has one dashed outline, like
          the cardio chart. */}
      <div className="flex gap-2">
        <div className="w-[68px] shrink-0 flex flex-col gap-1.5">
          {rows.map(([label]) => <span key={label} className="h-[22px] flex items-center text-xs font-semibold text-stone-500">{label}</span>)}
        </div>
        <div className="flex-1 grid gap-[3px]" style={{ gridTemplateColumns: COLUMNS }}>
          {weeks.map(({ start, entry }) => (
            <Fragment key={start.getTime()}>
            {entry?.live && spacer}
            <div
              className={`flex flex-col gap-1.5 rounded-md ${entry?.live ? 'outline-[1.5px] outline-dashed outline-offset-2 outline-stone-400' : ''}`}
            >
              {rows.map(([label, value, text = value]) => {
                const v = entry ? value(entry) : 0
                return (
                  <div
                    key={label}
                    title={`${label}, ${entry?.live ? 'this week so far' : `week of ${short(start)}`}: ${entry ? text(entry) : 'not saved'}`}
                    className={`h-[22px] rounded-[4px] flex items-center justify-center text-[9px] font-bold text-white ${LEVELS[Math.min(v, 4)]}`}
                  >
                    {v >= 3 ? '✓' : ''}
                  </div>
                )
              })}
            </div>
            </Fragment>
          ))}
        </div>
      </div>
      {/* Every third week dated under its column, counting back from this one. */}
      <div className="flex gap-2 mt-2">
        <span className="w-[68px] shrink-0" />
        <div className="flex-1 grid gap-[3px] text-[10px] text-stone-400" style={{ gridTemplateColumns: COLUMNS }}>
          {weeks.map(({ start, entry }, i) => (
            <Fragment key={start.getTime()}>
              {entry?.live && spacer}
              <span className="flex justify-center whitespace-nowrap">
                {(weeks.length - 1 - i) % 3 === 0 ? (entry?.live ? 'Now' : short(start)) : ''}
              </span>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

const fmt = n => (Number.isInteger(n) ? String(n) : n.toFixed(1))
// A change in help on an assisted move, which reads the wrong way as + or −.

// One exercise across the weeks it was done: each point carries its week,
// the charted value, and the lift as saved. A PR beats every earlier point
// in the better direction (lower when the move is assisted).
function seriesFor(exercise, weeks) {
  const all = weeks
    .map(w => ({ start: w.start, live: !!w.entry?.live, lift: w.entry?.lifts?.[exercise.id] }))
    .map(p => ({ ...p, m: metric(p.lift) }))
    .filter(p => p.m)
  const unit = all.at(-1)?.m.unit
  // Only compare like with like if the exercise switched mode along the way.
  const points = all.filter(p => p.m.unit === unit)
  let best = null
  for (const p of points) {
    p.pr = best !== null && (p.m.v - best) * p.m.better > 0
    if (best === null || (p.m.v - best) * p.m.better > 0) best = p.m.v
  }
  return points
}

// One exercise: its name over the same three things for every one, in
// columns that line up from row to row (its weight now, how much that's
// moved over the last 12 weeks and its heaviest ever, `best`), with a mini
// chart down the right.
function ExerciseTrend({ exercise, weeks, best }) {
  const points = seriesFor(exercise, weeks)
  const latest = points.at(-1)?.m
  const change = latest ? latest.v - points[0].m.v : 0

  return (
    <div className="bg-white shadow-sm rounded-2xl px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-stone-900 truncate">{exercise.name}</p>
        {latest ? (
          // The same widths on every row, split by a line between each.
          <div className="grid grid-cols-[3.25rem_6rem_minmax(0,1fr)] divide-x divide-stone-200 text-[13px] text-stone-500 mt-1 tabular-nums whitespace-nowrap">
            <span className="pr-2">{fmt(latest.v)} lb</span>
            <span className="px-2 text-center">
              <span className={`font-semibold ${change > 0 ? 'text-emerald-700' : 'text-stone-400'}`}>
                {`${change >= 0 ? '+' : ''}${fmt(change)}`}
              </span>
              <span className="text-[11px] text-stone-400">{` in ${WEEKS} wks`}</span>
            </span>
            <span className="pl-2 truncate">
              <span className="text-[10px] font-extrabold text-white bg-red-600 rounded px-1 py-px align-[1px]">PR</span>
              {` ${fmt(best)} lb`}
            </span>
          </div>
        ) : (
          <p className="text-sm text-stone-400 mt-1">No sets saved yet</p>
        )}
      </div>
      <Sparkline values={points.map(p => p.m.v)} />
    </div>
  )
}

// "10/18/26"
const mmddyy = d => d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })

const ROW = 'grid grid-cols-[minmax(0,1fr)_7.5rem_minmax(0,1fr)] items-center gap-3 px-4'

// A week's totals, split parts included: "3 / 30" (sets / reps), or for
// holds "3 / 2:15" (sets / time held).
function setsOf(lift, unit) {
  const all = [...(lift?.sets ?? []), ...(lift?.splits ?? []).flatMap(x => x.sets)]
  const sum = all.reduce((n, x) => n + x, 0)
  return `${all.length} / ${unit === 's' ? `${Math.floor(sum / 60)}:${String(sum % 60).padStart(2, '0')}` : sum}`
}

// One exercise's trend as a pop-up (from its card in a workout): its row
// as Trends shows it, then each week it was done, newest first.
export function ExerciseTrendSheet({ store, exercise, onClose }) {
  const weeks = lastWeeks(store.history, store.current)
  const saved = [store.current, ...store.history]
  const points = seriesFor(exercise, weeks)
  const unit = points.at(-1)?.m.unit
  const assist = points.at(-1)?.m.assist
  const best = Math.max(0, ...saved.map(w => metric(w.lifts?.[exercise.id])).filter(m => m?.unit === 'lb' && !m.assist).map(m => m.v))
  const label = { lb: assist ? 'lb help' : 'lb', s: 's', reps: 'reps' }[unit]
  return (
    <SettingsSheet title={`${exercise.name} trend`} closeLabel="Done" onClose={onClose}>
      {/* What each week's number is, for this kind of exercise. */}
      {unit && <p className="-mt-1 text-sm text-stone-500">{{
        lb: 'Weight is the average across your sets.',
        s: 'Longest is your best hold that week.',
        reps: 'Most is your best set that week.',
      }[unit]}</p>}
      {unit === 'lb' && !assist && <ExerciseTrend exercise={exercise} weeks={weeks} best={best} />}
      {points.length ? (
        // Three columns: the week, its number (weight, longest hold or most
        // reps), and the sets done that week.
        <div className="mt-3 rounded-2xl bg-stone-50 divide-y divide-stone-200/70 text-[15px] tabular-nums">
          <div className={`${ROW} py-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400`}>
            <span>Week</span>
            <span className="text-center">{{ lb: 'Weight', s: 'Longest', reps: 'Most' }[unit]}</span>
            <span className="text-right">{unit === 's' ? 'Sets / time' : 'Sets / reps'}</span>
          </div>
          {[...points].reverse().map(p => (
            <div key={p.start.getTime()} className={`${ROW} py-2.5`}>
              <span className="text-stone-600 truncate">{p.live ? 'This week' : mmddyy(p.start)}</span>
              {/* PR at the left of the column, the number centered in it. */}
              <span className="relative text-center font-semibold text-stone-900 whitespace-nowrap">
                {p.pr && <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-white bg-red-600 rounded px-1 py-px">PR</span>}
                {fmt(p.m.v)} {label}
              </span>
              <span className="text-right text-stone-600 truncate">{setsOf(p.lift, unit === 's' ? 's' : '')}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-stone-400">No sets saved in the last {WEEKS} weeks.</p>
      )}
    </SettingsSheet>
  )
}

// A small fixed-size chart at the end of a row, drawn at its own
// proportions so the end dot isn't squashed.
function Sparkline({ values }) {
  const w = 64, h = 36
  const size = 'w-16 h-9 shrink-0'
  if (values.length < 2) {
    return (
      <div className={`${size} flex items-center justify-end`}>
        {values.length === 1
          ? <span className="w-2 h-2 rounded-full bg-orange-600" />
          : <span className="w-full border-t border-dashed border-stone-200" />}
      </div>
    )
  }
  const lo = Math.min(...values), hi = Math.max(...values)
  const y = v => (hi === lo ? h / 2 : 3 + ((hi - v) / (hi - lo)) * (h - 6))
  const x = i => 2 + (i * (w - 6)) / (values.length - 1)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={size} aria-hidden="true">
      <polyline
        fill="none"
        stroke="#f54900"
        strokeWidth="1.8"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
      />
      <circle cx={x(values.length - 1)} cy={y(values.at(-1))} r="2.6" fill="#f54900" />
    </svg>
  )
}

// How often each plan was finished, flagging one falling well behind.
function Balance({ weeks }) {
  const saved = weeks.filter(w => w.entry)
  const counts = GYM_ORDER.map(id => ({
    id,
    done: saved.filter(w => w.entry.plans.some(p => p.id === id && p.total > 0 && p.done === p.total)).length,
  }))
  const most = Math.max(...counts.map(c => c.done))
  const behind = saved.length >= 4 ? counts.filter(c => c.done <= most / 2 && most > 0) : []

  // A tile per plan, like the cardio numbers: how many of the weeks it was
  // finished, red when it's falling well behind the others.
  return (
    <div className="mb-2.5">
      <p className="text-xs text-stone-400 uppercase tracking-wider font-medium px-1 mb-2">
        Plans finished in the last {saved.length} {saved.length === 1 ? 'week' : 'weeks'}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {counts.map(({ id, done }) => {
          const late = behind.some(b => b.id === id)
          return (
            // Tall enough for a name on two lines, so they all match.
            <div key={id} className="bg-white shadow-sm rounded-xl px-3 py-1.5 min-h-[46px] min-w-0 flex items-center gap-2">
              <p className="flex-1 min-w-0 text-xs leading-tight text-stone-500">{workouts[id].short}</p>
              <p className={`shrink-0 text-base font-bold tracking-tight tabular-nums ${late ? 'text-red-600' : 'text-stone-900'}`}>
                {done}<span className="ml-0.5 text-[11px] font-medium text-stone-400">/ {saved.length}</span>
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
