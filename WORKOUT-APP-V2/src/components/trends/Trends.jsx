import { Fragment, useRef, useState } from 'react'
import { useDragToClose } from '../../hooks/useDragToClose'
import { workouts, GYM_ORDER } from '../../data/workout'
import { calendarWeekOf } from '../../store/weeks'
import { goalLevel } from '../../utils/goal'
import { EXERCISE_BANK, EXERCISE_BY_ID } from '../../data/exercises'
import { metric } from '../../utils/lifts'
import CardioTrends from './CardioTrends'

const WEEKS = 12

// Strength tabs: each body area and the bank's muscle groups in it.
const AREAS = [
  ['upper', 'Upper', ['chest', 'back', 'shoulders', 'arms']],
  ['legs', 'Legs', ['legs']],
  ['core', 'Core', ['core']],
]

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
        <p className="text-stone-400 text-sm mt-1">Updates as you go, this week included</p>
      </div>
      <Trends store={store} />
    </div>
  )
}

function Trends({ store }) {
  const weeks = lastWeeks(store.history, store.current)
  const [view, setView] = useState('strength')
  const [tabId, setTabId] = useState('upper')
  const [open, setOpen] = useState(null) // exercise shown in the detail sheet
  // Lifts by body area: upper body (chest, back, shoulders, arms), legs and
  // core. Only lifts with sets saved show, in the bank's order.
  const done = new Set([store.current, ...store.history].flatMap(w => Object.keys(w.lifts ?? {})))
  const tabs = AREAS.map(([id, label, groups]) => ({
    id,
    label,
    name: label,
    ids: EXERCISE_BANK.filter(x => done.has(x.id) && groups.includes(x.group)).map(x => x.id),
  }))
  const tab = tabs.find(t => t.id === tabId) ?? tabs[0]
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
      {/* On Strength, the plan tiles and the area tabs stay put too. */}
      {view === 'strength' && <>
        <Balance weeks={weeks} />
        <div className="bg-stone-100 rounded-xl p-1 grid mb-3" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
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
      </>}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6">
      {view === 'strength' ? <>
        {/* Fill the space: one or two exercises stack full width; an odd one
            out at the end of a longer list spans both columns. */}
        {shown.length === 0 && (
          <p className="bg-white shadow-sm rounded-2xl p-4 text-sm text-stone-400">No {tab.name.toLowerCase()} lifts saved yet. They show here once you tick them.</p>
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

      </> : (
        <CardioTrends weeks={lastWeeks(store.history, store.current, WEEKS + 1, true)} goal={store.goals.cardio} logOf={store.cardioLogOf} />
      )}
      </div>

      {open && <ExerciseDetail exercise={open} group={{ label: tab.name }} weeks={weeks} onClose={() => setOpen(null)} />}
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
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-sm font-medium text-stone-500">Last {weeks.length - 1} weeks + this week</p>
        <p className="text-xs text-stone-400">✓ = goal met</p>
      </div>
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

// What a week's sets looked like: "107.5 lb × 8, 8, 7", "60s, 60s", "15, 12, 12 reps",
// then any split: "· 95 lb × 8, 8".
function setsText({ lift, m }) {
  const splits = (lift.splits ?? []).map(x => ` · ${fmt(x.weight)} lb${m.assist ? ' assist' : ''} × ${x.sets.join(', ')}`).join('')
  if (m.unit === 's') return lift.sets.map(s => `${s}s`).join(', ') + splits
  if (m.unit === 'reps') return `${lift.sets.join(', ')} reps${splits}`
  return `${fmt(lift.weight)} lb${m.assist ? ' assist' : ''} × ${lift.sets.join(', ')}${splits}`
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
  // Pull the sheet down to close it.
  const panel = useRef(null)
  const { offset, dragging, fade } = useDragToClose(panel, onClose)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center touch-none" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" style={{ opacity: fade }} />
      <div
        ref={panel}
        className="relative bg-white rounded-t-3xl w-full max-w-md px-5 h-[88dvh] overflow-y-auto overscroll-contain touch-pan-y"
        style={{
          paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
          transform: `translateY(${offset}px)`,
          transition: dragging ? 'none' : 'transform 180ms ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* The handle and title stay put while the rest scrolls. */}
        <div className="sticky top-0 z-10 bg-white rounded-t-3xl -mx-5 px-5 pt-3 pb-1">
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
            <div key={p.start.getTime()} className="flex items-center justify-between py-2 text-sm">
              <span className="text-stone-700">
                {p.live ? 'This week' : short(p.start)}
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
          {points[i].live ? 'This week' : short(points[i].start)}
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

  // A tile per plan, like the cardio numbers: how many of the weeks it was
  // finished, red when it's falling well behind the others.
  return (
    <div className="mb-2.5">
      <div className="grid grid-cols-4 gap-2">
        {counts.map(({ id, done }) => {
          const late = behind.some(b => b.id === id)
          return (
            <div key={id} className="bg-white shadow-sm rounded-2xl px-2.5 py-2.5 min-w-0">
              <p className={`text-xl font-bold tracking-tight tabular-nums ${late ? 'text-red-600' : 'text-stone-900'}`}>
                {done}<span className="text-xs font-medium text-stone-400">/{saved.length}</span>
              </p>
              <p className="text-[11px] leading-tight text-stone-400">{workouts[id].short}</p>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-stone-400 mt-1.5 px-1">
        Plans finished in the last {saved.length} {saved.length === 1 ? 'week' : 'weeks'}
        {behind.length > 0 && `. ${behind.map(b => workouts[b.id].short).join(' and ')} ${behind.length === 1 ? 'is' : 'are'} falling behind.`}
      </p>
    </div>
  )
}
