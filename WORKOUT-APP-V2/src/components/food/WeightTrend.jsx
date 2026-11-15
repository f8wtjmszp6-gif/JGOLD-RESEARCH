import { useState } from 'react'
import { dayKey } from '../../utils/nutrition'

const RANGES = [['1M', 30], ['3M', 91], ['6M', 182], ['1Y', 365]]
const noon = d => { const x = new Date(d); x.setHours(12, 0, 0, 0); return x }
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const short = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const avgOf = l => l.reduce((t, x) => t + x, 0) / l.length

// The points to draw for the last `days` days. One month: every weigh-in as
// a dot, and the line is the 7-day average on each of those days (a single
// day swings 1–3 lb with water and salt). Longer: one point per week, its
// average, so the line is the dots.
function series(weights, days) {
  const end = noon(new Date())
  const start = addDays(end, -(days - 1))
  const dots = []
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const lb = weights[dayKey(d)]
    if (lb != null) dots.push({ date: d, lb })
  }
  if (days <= 31) {
    const line = dots.map(p => {
      const near = Array.from({ length: 7 }, (_, k) => weights[dayKey(addDays(p.date, -k))]).filter(x => x != null)
      return { date: p.date, lb: avgOf(near), label: `${short(p.date)} · 7-day average`, own: p.lb }
    })
    return { start, end, dots, line }
  }
  const weeks = new Map()
  for (const p of dots) {
    const k = dayKey(addDays(p.date, -p.date.getDay()))
    if (!weeks.has(k)) weeks.set(k, { first: addDays(p.date, -p.date.getDay()), lbs: [] })
    weeks.get(k).lbs.push(p.lb)
  }
  const line = [...weeks.values()].map(w => {
    // Drawn mid-week, kept inside the range.
    const mid = addDays(w.first, 3)
    const date = mid > end ? end : mid < start ? start : mid
    return { date, lb: avgOf(w.lbs), label: `Week of ${short(w.first)}` }
  })
  return { start, end, dots: [], line }
}

// Body weight over time, in the Body weight sheet. Tap or drag along it to
// read a point; it starts on the latest.
export default function WeightTrend({ weights }) {
  const [range, setRange] = useState(1)
  const [sel, setSel] = useState(null)
  const days = RANGES[range][1]
  const { start, end, dots, line } = series(weights ?? {}, days)

  const W = 340, H = 150, L = 4, R = 36, T = 10, B = 22
  const all = [...line.map(p => p.lb), ...dots.map(p => p.lb)]
  let lo = Math.min(...all), hi = Math.max(...all)
  if (hi - lo < 4) { const c = (hi + lo) / 2; lo = c - 2; hi = c + 2 }
  lo = Math.floor(lo); hi = Math.ceil(hi)
  const x = d => L + ((d - start) / (end - start || 1)) * (W - L - R)
  const y = lb => T + (1 - (lb - lo) / (hi - lo)) * (H - T - B)
  const ticks = [hi, (hi + lo) / 2, lo]

  const at = sel != null && line[sel] ? sel : line.length - 1
  const shown = line[at]
  const change = line.length > 1 ? Math.round((line[line.length - 1].lb - line[0].lb) * 10) / 10 : null

  function pick(e) {
    if (!line.length) return
    const box = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - box.left) / box.width) * W
    let best = 0
    line.forEach((p, i) => { if (Math.abs(x(p.date) - px) < Math.abs(x(line[best].date) - px)) best = i })
    setSel(best)
  }

  const seg = on => `flex-1 py-1 rounded-lg text-xs font-semibold transition-colors ${on ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`
  return (
    <div className="rounded-2xl bg-stone-50 px-4 py-3 flex flex-col gap-3">
      <div className="bg-stone-200/60 rounded-xl p-1 flex" role="radiogroup" aria-label="Time range">
        {RANGES.map(([name], i) => (
          <button key={name} role="radio" aria-checked={range === i} onClick={() => { setRange(i); setSel(null) }} className={seg(range === i)}>{name}</button>
        ))}
      </div>

      {line.length < 2 ? (
        <p className="py-10 text-center text-sm text-stone-500">Weigh in a few more times to see your trend.</p>
      ) : (
        <>
          {/* The point you're on, and the change across the range. */}
          <div className="flex items-end justify-between gap-3">
            <span className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs text-stone-600 truncate">{shown.label}</span>
              <span className="text-xl font-bold text-stone-900 tabular-nums">{shown.lb.toFixed(1)}<span className="text-sm font-semibold text-stone-500"> lb</span></span>
            </span>
            {change != null && (
              <span className="text-sm text-stone-600 text-right shrink-0">
                Since {short(line[0].date)}<br />
                <b className="text-stone-900">{change === 0 ? 'No change' : `${change > 0 ? '↑' : '↓'} ${Math.abs(change)} lb`}</b>
              </span>
            )}
          </div>

          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto touch-none select-none" onPointerDown={pick} onPointerMove={e => (e.buttons || e.pointerType === 'mouse') && pick(e)} role="img" aria-label={`Body weight trend: ${line[0].lb.toFixed(1)} lb on ${short(line[0].date)} to ${line[line.length - 1].lb.toFixed(1)} lb on ${short(line[line.length - 1].date)}`}>
            {/* Recessive grid: three weights on the right. */}
            {ticks.map(t => (
              <g key={t}>
                <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="stroke-stone-200" strokeWidth="1" />
                <text x={W - R + 6} y={y(t) + 3.5} className="fill-stone-400 text-[10px] tabular-nums">{Number.isInteger(t) ? t : t.toFixed(1)}</text>
              </g>
            ))}
            <text x={L} y={H - 5} className="fill-stone-400 text-[10px]">{short(start)}</text>
            <text x={W - R} y={H - 5} textAnchor="end" className="fill-stone-400 text-[10px]">Today</text>

            {/* Each weigh-in (one month only), faint behind the average. */}
            {dots.map(p => <circle key={dayKey(p.date)} cx={x(p.date)} cy={y(p.lb)} r="2.5" className="fill-stone-300" />)}

            <polyline points={line.map(p => `${x(p.date)},${y(p.lb)}`).join(' ')} fill="none" className="stroke-accent-500" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {!dots.length && line.map((p, i) => <circle key={i} cx={x(p.date)} cy={y(p.lb)} r="2.5" className="fill-accent-500" />)}

            {/* The point you're on. */}
            <line x1={x(shown.date)} x2={x(shown.date)} y1={T} y2={H - B} className="stroke-stone-300" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={x(shown.date)} cy={y(shown.lb)} r="5" className="fill-accent-500 stroke-stone-50" strokeWidth="2" />
          </svg>
        </>
      )}
    </div>
  )
}
