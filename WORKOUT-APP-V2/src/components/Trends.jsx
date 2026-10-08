import { useState } from 'react'
import { workouts, GYM_ORDER, MUSCLE_GROUPS } from '../data/workout'
import { calendarWeekOf } from '../hooks/useStore'
import { cardioLevel } from '../utils/goal'
import { EXERCISE_BANK } from '../data/exercises'

const WEEKS = 12

const DAY = 86400000

// "YYYY-MM-DD" Monday → Date, and back.
const toDate = key => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d) }
const toKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const short = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

// The last 12 calendar weeks up to the newest saved one, oldest first. A week
// you never reset in is a gap (null), so the grid keeps real time.
function lastWeeks(history) {
  if (!history.length) return []
  const byWeek = Object.fromEntries(history.map(w => [calendarWeekOf(w), w]))
  const newest = toDate(calendarWeekOf(history[0]))
  return Array.from({ length: WEEKS }, (_, i) => {
    const d = new Date(newest.getTime() - (WEEKS - 1 - i) * 7 * DAY)
    d.setHours(12)
    return { monday: d, entry: byWeek[toKey(d)] ?? null }
  }).filter((w, i, all) => w.entry || all.slice(0, i).some(x => x.entry))
}

// What a mini chart tracks for an exercise in a given week.
//   hold → longest hold (s) · weighted → weight (lb; less is better when
//   assisted) · bodyweight → best set (reps)
function metric(lift) {
  if (!lift?.sets?.length) return null
  if (lift.mode === 'hold') return { v: Math.max(...lift.sets), unit: 's', better: 1 }
  if (lift.weight > 0) return { v: lift.weight, unit: 'lb', better: lift.assist ? -1 : 1, assist: lift.assist }
  return { v: Math.max(...lift.sets), unit: 'reps', better: 1 }
}

// The Trends screen: its own page off the header, like Past weeks.
export default function TrendsScreen({ store, onBack }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-4 bg-stone-50 shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-accent-500 mb-4 active:opacity-70">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="text-sm font-medium">Today</span>
        </button>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Trends</h1>
        <p className="text-stone-400 text-sm mt-1">From your saved weeks</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <Trends store={store} />
      </div>
    </div>
  )
}

function Trends({ store }) {
  const weeks = lastWeeks(store.history)
  const [group, setGroup] = useState(MUSCLE_GROUPS[0])
  const [open, setOpen] = useState(null) // exercise shown in the detail sheet
  // A group's charts: exercises from the bank that are in one of your
  // workouts now, or that you've done in a saved week.
  const inWorkouts = new Set(GYM_ORDER.flatMap(id => store.getExercises(id).map(x => x.id)))
  const done = new Set(store.history.flatMap(w => Object.keys(w.lifts ?? {})))
  const shown = EXERCISE_BANK.filter(x => x.group === group.id && (inWorkouts.has(x.id) || done.has(x.id)))

  if (!weeks.length) {
    return (
      <div className="bg-white shadow-sm rounded-2xl p-5 text-center">
        <p className="font-semibold text-stone-900">No trends yet</p>
        <p className="text-sm text-stone-500 mt-1 leading-relaxed">
          Trends build from your saved weeks. Start a new week with the reset button and they&rsquo;ll begin to fill in.
        </p>
      </div>
    )
  }

  return (
    <>
      <WeekGrid weeks={weeks} />

      <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mt-5 mb-2 px-1">Strength</p>
      <div className="bg-stone-100 rounded-xl p-1 grid grid-cols-6 mb-2.5">
        {MUSCLE_GROUPS.map(g => (
          <button
            key={g.id}
            onClick={() => setGroup(g)}
            className={`py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
              group.id === g.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>
      {/* Fill the space: one or two exercises stack full width; an odd one
          out at the end of a longer list spans both columns. */}
      {shown.length === 0 && (
        <p className="bg-white shadow-sm rounded-2xl p-4 text-sm text-stone-400">None of your workouts has a {group.label.toLowerCase()} exercise right now.</p>
      )}
      <div className={`grid gap-2 ${shown.length <= 2 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {shown.map((ex, i, list) => {
          const wide = list.length <= 2 || (list.length % 2 === 1 && i === list.length - 1)
          return (
            <ExerciseTrend
              key={ex.id}
              exercise={ex}
              weeks={weeks}
              wide={wide}
              onOpen={() => setOpen(ex)}
            />
          )
        })}
      </div>

      <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mt-5 mb-2 px-1">Balance</p>
      <Balance weeks={weeks} />

      {open && <ExerciseDetail exercise={open} group={group} weeks={weeks} onClose={() => setOpen(null)} />}
    </>
  )
}

// One square per week for workouts and for stretching, greener toward the
// 3–4 goal, ✓ when met. Same green ramp as the This week card.
// In dark mode more weeks read brighter, from shades the dark palette leaves alone.
const LEVELS = [
  'bg-stone-100',
  'bg-emerald-200 dark:bg-emerald-700',
  'bg-emerald-300 dark:bg-emerald-600',
  'bg-emerald-500',
  'bg-emerald-700 dark:bg-emerald-400',
]
function WeekGrid({ weeks }) {
  const rows = [
    ['Workouts', w => w.week.gym + w.week.class + (w.week.cardio ?? 0) + (w.week.stretchWork ?? 0)],
    ['Stretching', w => w.stretch.total],
    ['Cardio', w => (w.cardio ? cardioLevel(w.cardio.total) : 0), w => (w.cardio ? `${w.cardio.total} min` : 'not tracked')],
  ]
  return (
    <div className="bg-white shadow-sm rounded-2xl px-4 py-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-sm font-medium text-stone-500">Last {weeks.length} {weeks.length === 1 ? 'week' : 'weeks'}</p>
        <p className="text-xs text-stone-400">✓ = goal met</p>
      </div>
      {rows.map(([label, value, text = value]) => (
        <div key={label} className="flex items-center gap-2 mb-1.5">
          <span className="w-[68px] text-xs font-semibold text-stone-500 shrink-0">{label}</span>
          <div className="flex-1 grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`, maxWidth: `${weeks.length * 26}px` }}>
            {weeks.map(({ monday, entry }) => {
              const v = entry ? value(entry) : 0
              return (
                <div
                  key={monday.getTime()}
                  title={`Week of ${short(monday)}: ${entry ? text(entry) : 'not saved'}`}
                  className={`aspect-square rounded-[4px] flex items-center justify-center text-[9px] font-bold text-white ${LEVELS[Math.min(v, 4)]}`}
                >
                  {v >= 3 ? '✓' : ''}
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <div className="flex justify-between text-[10px] text-stone-400 pl-[76px] mt-1">
        <span>{short(weeks[0].monday)}</span>
        <span>{short(weeks.at(-1).monday)}</span>
      </div>
    </div>
  )
}

const fmt = n => (Number.isInteger(n) ? String(n) : n.toFixed(1))

// One exercise across the weeks it was done: each point carries its week,
// the charted value, and the lift as saved. A PR beats every earlier point
// in the better direction (lower when the move is assisted).
function seriesFor(exercise, weeks) {
  const all = weeks
    .map(w => ({ monday: w.monday, lift: w.entry?.lifts?.[exercise.id] }))
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

// A mini chart of one exercise; tap it for the detail sheet.
function ExerciseTrend({ exercise, weeks, wide, onOpen }) {
  const points = seriesFor(exercise, weeks)
  const latest = points.at(-1)?.m
  const change = points.length > 1 ? latest.v - points[0].m.v : 0
  const improved = change * (latest?.better ?? 1) > 0

  return (
    <button
      onClick={points.length ? onOpen : undefined}
      className={`bg-white shadow-sm rounded-2xl px-3 py-2.5 min-w-0 text-left ${wide ? 'col-span-2' : ''} ${points.length ? 'active:scale-[0.98] transition-transform' : 'cursor-default'}`}
    >
      <p className="text-xs font-semibold text-stone-900 truncate">{exercise.name}</p>
      {latest ? (
        <p className="text-[11px] text-stone-500 mt-0.5">
          {fmt(latest.v)} {latest.unit}{latest.assist ? ' assist' : ''}
          {points.length > 1 && (
            <span className={`ml-1 font-semibold ${change === 0 ? 'text-stone-400' : improved ? 'text-emerald-700' : 'text-stone-500'}`}>
              {change === 0 ? 'no change' : `${change > 0 ? '+' : ''}${fmt(change)} ${latest.unit}`}
            </span>
          )}
        </p>
      ) : (
        <p className="text-[11px] text-stone-400 mt-0.5">No sets saved yet</p>
      )}
      <Sparkline values={points.map(p => p.m.v)} tall={wide} />
    </button>
  )
}

// What a week's sets looked like: "107.5 lb × 8, 8, 7", "60s, 60s", "15, 12, 12 reps".
function setsText({ lift, m }) {
  if (m.unit === 's') return lift.sets.map(s => `${s}s`).join(', ')
  if (m.unit === 'reps') return `${lift.sets.join(', ')} reps`
  return `${fmt(lift.weight)} lb${m.assist ? ' assist' : ''} × ${lift.sets.join(', ')}`
}

const UNIT_LABEL = { lb: 'working weight', s: 'longest hold', reps: 'best set' }

// Tapping a mini chart: a large chart with PR dots, quick stats and the
// last five weeks of sets, in a sheet over Trends.
function ExerciseDetail({ exercise, group, weeks, onClose }) {
  const points = seriesFor(exercise, weeks)
  const latest = points.at(-1).m
  const change = points.length > 1 ? latest.v - points[0].m.v : 0
  const improved = change * latest.better > 0
  const prs = points.filter(p => p.pr).length

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-md px-5 pt-3 max-h-[88dvh] overflow-y-auto"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-stone-200 mx-auto mb-4" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-stone-900 font-bold text-lg leading-tight">{exercise.name}</h3>
            <p className="text-sm text-stone-400">
              {group.label} · {UNIT_LABEL[latest.unit]}{latest.assist ? ' (assisted — less is better)' : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-accent-500 text-sm font-semibold active:opacity-70 shrink-0">Done</button>
        </div>

        <div className="grid grid-cols-3 gap-2 my-4">
          <Stat value={`${fmt(latest.v)}`} label={`now (${latest.unit})`} />
          <Stat
            value={change === 0 ? '—' : `${change > 0 ? '+' : ''}${fmt(change)}`}
            label={`${points.length} ${points.length === 1 ? 'week' : 'weeks'}`}
            tone={change === 0 ? '' : improved ? 'text-emerald-700' : 'text-stone-500'}
          />
          <Stat value={String(prs)} label={prs === 1 ? 'PR' : 'PRs'} />
        </div>

        <BigChart points={points} />

        <p className="text-sm font-bold text-stone-900 mt-4 mb-1">Recent weeks</p>
        <div className="divide-y divide-stone-100">
          {points.slice(-5).reverse().map(p => (
            <div key={p.monday.getTime()} className="flex items-center justify-between py-2 text-sm">
              <span className="text-stone-700">
                {short(p.monday)}
                {p.pr && <span className="ml-1.5 text-[10px] font-extrabold text-white bg-orange-600 rounded px-1 py-px align-[1px]">PR</span>}
              </span>
              <span className="text-stone-500">{setsText(p)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Stat({ value, label, tone = '' }) {
  return (
    <div className="bg-stone-100 rounded-xl px-3 py-2">
      <p className={`text-lg font-bold text-stone-900 leading-tight ${tone}`}>{value}</p>
      <p className="text-[11px] text-stone-500">{label}</p>
    </div>
  )
}

// Large line chart: value axis, first/middle/last dates, PR dots filled.
function BigChart({ points }) {
  const W = 320, H = 170, L = 34, R = 10, T = 12, B = 22
  const vals = points.map(p => p.m.v)
  let lo = Math.min(...vals), hi = Math.max(...vals)
  if (lo === hi) { lo -= 5; hi += 5 }
  const pad = (hi - lo) * 0.15
  lo -= pad; hi += pad
  const x = i => (points.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (points.length - 1))
  const y = v => T + ((hi - v) / (hi - lo)) * (H - T - B)
  // Clean axis steps (…2.5, 5, 10, 25…) so labels land on round numbers.
  const raw = (hi - lo) / 4
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map(k => k * mag).find(s => s >= raw)
  const ticks = []
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v)
  const dates = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Chart of ${points.length} weeks`}>
      {ticks.map(v => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--color-stone-100)" />
          <text x={L - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="var(--color-stone-400)">{fmt(v)}</text>
        </g>
      ))}
      {points.length > 1 && (
        <polyline
          fill="none" stroke="#f54900" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round"
          points={points.map((p, i) => `${x(i)},${y(p.m.v)}`).join(' ')}
        />
      )}
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.m.v)} r={p.pr ? 5 : 3.5} fill={p.pr ? '#f54900' : 'var(--surface)'} stroke="#f54900" strokeWidth="2" />
      ))}
      {dates.map(i => (
        <text key={i} x={x(i)} y={H - 4} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} fontSize="10" fill="var(--color-stone-400)">
          {short(points[i].monday)}
        </text>
      ))}
    </svg>
  )
}

// Drawn at roughly the card's own proportions (narrow or full width), so the
// stretch to fit doesn't squash the end dot.
function Sparkline({ values, tall }) {
  const w = tall ? 300 : 134, h = tall ? 52 : 34
  const height = tall ? 'h-[52px]' : 'h-[34px]'
  if (values.length < 2) {
    return (
      <div className={`${height} mt-1 flex items-center`}>
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
    <svg viewBox={`0 0 ${w} ${h}`} className={`w-full ${height} mt-1`} preserveAspectRatio="none" aria-hidden="true">
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

  return (
    <div className="bg-white shadow-sm rounded-2xl px-4 py-3.5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-stone-500">Plans finished</p>
        <p className="text-xs text-stone-400">last {saved.length} {saved.length === 1 ? 'week' : 'weeks'}</p>
      </div>
      {counts.map(({ id, done }) => (
        <div key={id} className="flex items-center gap-2.5 my-2">
          <span className="w-[128px] shrink-0 text-xs font-semibold text-stone-700 truncate">{workouts[id].short}</span>
          <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${behind.some(b => b.id === id) ? 'bg-orange-300' : 'bg-orange-600'}`}
              style={{ width: `${saved.length ? (done / saved.length) * 100 : 0}%` }}
            />
          </div>
          <span className="w-9 text-right text-xs font-bold text-stone-900">{done}/{saved.length}</span>
        </div>
      ))}
      {behind.length > 0 && (
        <p className="text-xs text-stone-500 mt-2">
          {behind.map(b => workouts[b.id].short).join(' and ')} {behind.length === 1 ? 'is' : 'are'} falling behind.
        </p>
      )}
    </div>
  )
}
