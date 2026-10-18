import { useLayoutEffect, useRef, useState } from 'react'

// Where cardio minutes come from, in the order a week's breakdown lists them.
const GROUPS = [['walk', 'Walks'], ['class', 'Classes'], ['sport', 'Sports & hikes'], ['other', 'Cardio sessions'], ['warmup', 'Warm-ups']]
// What a session was, as its own activity: its type when it has one.
const activityOf = x =>
  x.kind === 'walk' ? 'Walk'
    : x.kind === 'class' ? 'Classes'
      : x.kind === 'warmup' ? 'Warm-ups'
        : x.kind === 'sport' ? x.type || 'Sport'
          : x.type && x.type !== 'Other' ? x.type : 'Cardio'
// Hard minutes count double toward the goal, as on the This week card.
const counted = x => x.minutes * (x.hard ? 2 : 1)
const sum = list => list.reduce((n, v) => n + v, 0)
const short = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const SHOWN = 5

// Trends' Cardio section: this week, the average and the goal streak, how
// much of it is hard, minutes each week against the goal (tap a week for what
// you did), and the activities you do most. `weeks` is Trends' weeks, oldest
// first: 12 full weeks, then this one (weeks before the app was used are empty); `logOf` gives a week's sessions, or null for a
// week saved before weeks kept their details.
export default function CardioTrends({ weeks, goal, logOf }) {
  const rows = weeks.map(w => {
    const log = w.entry ? logOf(w.entry) : null
    const c = w.entry?.cardio
    const parts = log
      ? GROUPS.map(([k, label]) => [label, sum(log.filter(x => x.kind === k).map(counted))])
      : c ? [['Classes', c.class], ['Walks', c.walk], ['Cardio sessions & sports', c.other], ['Warm-ups', c.warmup ?? 0]] : []
    return { start: w.start, live: !!w.entry?.live, saved: !!w.entry, log, total: c?.total ?? 0, parts: parts.filter(([, m]) => m > 0) }
  })
  // Full weeks since you started: earlier empty ones don't pull the average down.
  const first = rows.findIndex(r => r.saved)
  const past = rows.slice(Math.max(first, 0)).filter(r => !r.live)
  const now = rows.find(r => r.live)
  const avg = past.length ? Math.round(sum(past.map(r => r.total)) / past.length) : null
  let streak = 0
  for (let i = past.length - 1; i >= 0 && past[i].total >= goal.min; i--) streak++

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Stat value={now?.total ?? 0} unit="min" label="This week" />
        <Stat value={avg ?? '–'} unit={avg === null ? '' : 'min'} label="Weekly avg" />
        <Stat value={streak} unit={streak === 1 ? 'wk' : 'wks'} label="Goal streak" good={streak > 0} />
      </div>
      <EasyHard rows={rows} />
      <WeeklyMinutes rows={rows} goal={goal} />
      <TopActivities rows={rows} />
    </>
  )
}

function Stat({ value, unit, label, good }) {
  return (
    <div className="bg-white shadow-sm rounded-2xl px-3 py-2.5 min-w-0">
      <p className={`text-xl font-bold tracking-tight tabular-nums ${good ? 'text-emerald-700' : 'text-stone-900'}`}>
        {value}<span className="text-xs font-medium text-stone-400 ml-0.5">{unit}</span>
      </p>
      <p className="text-xs text-stone-400 truncate">{label}</p>
    </div>
  )
}

// What share of your cardio minutes were hard.
function EasyHard({ rows }) {
  const all = sum(rows.flatMap(r => (r.log ?? []).map(x => x.minutes)))
  if (!all) return null
  const pct = Math.round((sum(rows.flatMap(r => (r.log ?? []).filter(x => x.hard).map(x => x.minutes))) / all) * 100)
  return (
    <div className="bg-white shadow-sm rounded-2xl px-4 py-3.5 mt-2">
      <p className="text-sm font-semibold text-stone-900">{pct}% of your cardio is hard</p>
      <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden mt-2.5" aria-hidden="true">
        {pct < 100 && <span className="bg-emerald-200" style={{ width: `${100 - pct}%` }} />}
        {pct > 0 && <span className="bg-emerald-600" style={{ width: `${pct}%` }} />}
      </div>
      <div className="flex justify-between text-xs text-stone-400 mt-1">
        <span>Easy {100 - pct}%</span>
        <span>Hard {pct}%</span>
      </div>
    </div>
  )
}

// A bar per week, one color, against the goal band. Tapping a bar shows what
// you did that week; tap it again (or another) to change it. Drawn at the
// card's real width, so a wider screen spreads the bars out rather than
// blowing the chart up.
function WeeklyMinutes({ rows, goal }) {
  const [picked, setPicked] = useState(null)
  const box = useRef(null)
  const [W, setW] = useState(320)
  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, Math.round(e.contentRect.width))))
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [])
  const H = 170, L = 28, B = 18, T = 6
  const top = Math.max(goal.max, ...rows.map(r => r.total))
  const step = top > 400 ? 200 : 100
  const max = Math.ceil((top * 1.08) / step) * step
  const y = v => T + (H - T - B) * (1 - v / max)
  const slot = (W - L) / rows.length
  const bw = Math.min(slot - 6, 22)
  const cx = i => L + slot * i + slot / 2
  const r = picked === null ? null : rows[picked]

  return (
    <div className="bg-white shadow-sm rounded-2xl px-4 py-3.5 mt-2">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold text-stone-900">Cardio minutes</p>
        <p className="text-xs text-stone-400">{rows.length > 1 ? `Last ${rows.length - 1} ${rows.length === 2 ? 'week' : 'weeks'} + this week` : 'This week'}</p>
      </div>
      <div ref={box} className="relative mt-2">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block" role="img" aria-label={`Cardio minutes for the last ${rows.length} weeks against your ${goal.min}–${goal.max} goal`}>
          <rect x={L} y={y(goal.max)} width={W - L} height={y(goal.min) - y(goal.max)} className="fill-emerald-500/10" />
          {Array.from({ length: max / step + 1 }, (_, i) => i * step).map(v => (
            <g key={v}>
              <line x1={L} x2={W} y1={y(v)} y2={y(v)} className="stroke-stone-100" />
              <text x={L - 5} y={y(v) + 3.5} textAnchor="end" fontSize="9.5" className="fill-stone-400">{v}</text>
            </g>
          ))}
          {[goal.min, goal.max].map(v => <line key={v} x1={L} x2={W} y1={y(v)} y2={y(v)} strokeDasharray="3 3" className="stroke-emerald-500/50" />)}
          {rows.map((row, i) => {
            const h = y(0) - y(row.total)
            const faded = picked !== null && picked !== i
            return (
              <g key={i}>
                {/* This week is still going: a light bar with a dashed outline. */}
                {row.live ? (
                  <rect
                    x={cx(i) - bw / 2 + 0.75} y={Math.min(y(row.total), y(0) - 6) + 0.75} width={bw - 1.5} height={Math.max(h, 6) - 1.5} rx={Math.min(4, Math.max(h, 6) / 2)}
                    strokeWidth="1.5" strokeDasharray="3 2.5"
                    className={`fill-emerald-600/15 stroke-emerald-600 transition-opacity ${faded ? 'opacity-40' : ''}`}
                  />
                ) : h > 0 && <rect x={cx(i) - bw / 2} y={y(row.total)} width={bw} height={h} rx={Math.min(4, h / 2)} className={`fill-emerald-600 transition-opacity ${faded ? 'opacity-40' : ''}`} />}
                {(i === rows.length - 1 || (rows.length - 1 - i) % 3 === 0) && (
                  <text x={cx(i)} y={H - 4} textAnchor="middle" fontSize="9.5" className="fill-stone-400">{row.live ? 'Now' : short(row.start)}</text>
                )}
                <rect
                  x={L + slot * i} y={T} width={slot} height={H - T - B} fill="transparent"
                  className="cursor-pointer"
                  onClick={() => setPicked(picked === i ? null : i)}
                >
                  <title>{`Week of ${short(row.start)}: ${row.total} min`}</title>
                </rect>
              </g>
            )
          })}
        </svg>
        {r && (
          <div
            className="absolute top-0 -translate-x-1/2 w-44 rounded-xl bg-stone-800 text-white text-xs px-3 py-2 shadow-lg pointer-events-none"
            style={{ left: `${Math.min(Math.max((cx(picked) / W) * 100, 28), 72)}%` }}
          >
            <p className="font-semibold mb-1">Week of {short(r.start)}{r.live && ' (so far)'}</p>
            {r.parts.length === 0 && <p className="text-stone-300">No cardio</p>}
            {r.parts.map(([label, m]) => (
              <p key={label} className="flex justify-between gap-2 tabular-nums"><span className="text-stone-300">{label}</span><span>{m}</span></p>
            ))}
            <p className="flex justify-between gap-2 tabular-nums font-semibold border-t border-white/20 mt-1 pt-1">
              <span>Total</span><span>{r.total} min{r.total >= goal.min && ' ✓'}</span>
            </p>
          </div>
        )}
      </div>
      <p className="text-xs text-stone-400 mt-1">Shaded: your {goal.min}–{goal.max} min goal. Tap a week to see what you did.</p>
    </div>
  )
}

// Each activity by minutes over the weeks shown, with how many sessions and a
// line of it week to week. The top five show until you ask for the rest.
function TopActivities({ rows }) {
  const [all, setAll] = useState(false)
  const by = {}
  rows.forEach((r, i) => {
    for (const x of r.log ?? []) {
      const a = (by[activityOf(x)] ??= { name: activityOf(x), minutes: 0, count: 0, weeks: rows.map(() => 0) })
      a.minutes += x.minutes
      a.count += 1
      a.weeks[i] += x.minutes
    }
  })
  const list = Object.values(by).sort((a, b) => b.minutes - a.minutes)
  if (!list.length) return null
  const more = list.length - SHOWN
  return (
    <>
      <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mt-4 mb-2 px-1">What you do most</p>
      <div className="bg-white shadow-sm rounded-2xl px-4 py-1.5">
        {(all ? list : list.slice(0, SHOWN)).map(a => (
          <div key={a.name} className="flex items-center gap-3 py-2 border-t border-stone-100 first:border-t-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-900 truncate">{a.name}</p>
              <p className="text-xs text-stone-400">{a.count} {a.count === 1 ? 'session' : 'sessions'}</p>
            </div>
            <p className="text-sm font-semibold text-stone-900 tabular-nums">{a.minutes}<span className="text-xs font-normal text-stone-400"> min</span></p>
            <Spark values={a.weeks} />
          </div>
        ))}
        {more > 0 && (
          <button onClick={() => setAll(!all)} className="w-full text-left py-2.5 border-t border-stone-100 text-sm font-semibold text-accent-500 active:opacity-70">
            {all ? 'Show less' : `Show ${more} more`}
          </button>
        )}
      </div>
    </>
  )
}

function Spark({ values }) {
  const w = 64, h = 24, hi = Math.max(...values, 1)
  const pts = values.map((v, i) => [2 + (i * (w - 4)) / Math.max(values.length - 1, 1), h - 3 - (v / hi) * (h - 6)])
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="shrink-0" aria-hidden="true">
      <polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" className="stroke-emerald-600" />
      <circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r="2.4" className="fill-emerald-600" />
    </svg>
  )
}
