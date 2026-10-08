import { WEEKLY_GOAL, CARDIO_GOAL } from '../data/workout'

// The 3–4-a-week goal, shared by the workout and stretching cards.
// Slots up to the minimum are solid; the slots up to the max are dashed
// (the stretch target). Going past the max adds slots rather than hiding them.

export function GoalCount({ count, unit }) {
  const met = count >= WEEKLY_GOAL.min
  return (
    <p className="text-stone-900 text-right">
      <span className="text-lg font-semibold">{count}</span>
      <span className="text-sm text-stone-400"> / {WEEKLY_GOAL.min}–{WEEKLY_GOAL.max} {unit}</span>
      {met && <span className="block text-xs font-semibold text-emerald-700">✓ Goal met</span>}
    </p>
  )
}

// One goal as a row: label, bar, count — with a ✓ once it's met.
export function GoalRow({ label, count, fills }) {
  const met = count >= WEEKLY_GOAL.min
  return (
    <div className="flex items-center gap-3">
      <span className="w-[74px] text-sm font-semibold text-stone-700 shrink-0">{label}</span>
      <div className="flex-1">
        <GoalBar fills={fills} label={`${label}: ${count} of a ${WEEKLY_GOAL.min}–${WEEKLY_GOAL.max} goal`} />
      </div>
      <span className="w-12 text-right shrink-0">
        <span className="text-base font-semibold text-stone-900">{count}</span>
        {met && <span className="text-xs font-bold text-emerald-700 ml-0.5">✓</span>}
      </span>
    </div>
  )
}

// Cardio minutes against the 300-minute ideal, with a tick at the 150 minimum.
export function CardioRow({ minutes, fill }) {
  const met = minutes >= CARDIO_GOAL.min
  const pct = m => `${Math.min(100, (m / CARDIO_GOAL.max) * 100)}%`
  return (
    <div className="flex items-center gap-3">
      <span className="w-[74px] text-sm font-semibold text-stone-700 shrink-0">Cardio</span>
      <div
        className="flex-1 relative h-2.5 rounded bg-stone-200"
        role="img"
        aria-label={`Cardio: ${minutes} of ${CARDIO_GOAL.max} minutes, ${CARDIO_GOAL.min} minimum`}
      >
        <div className={`h-full rounded transition-all duration-500 ${fill}`} style={{ width: pct(minutes) }} />
        <div className="absolute -top-0.5 -bottom-0.5 w-0.5 rounded-full bg-white/90" style={{ left: pct(CARDIO_GOAL.min) }} />
      </div>
      <span className="w-12 text-right shrink-0 whitespace-nowrap">
        <span className="text-base font-semibold text-stone-900">{minutes}</span>
        {met && <span className="text-xs font-bold text-emerald-700 ml-0.5">✓</span>}
      </span>
    </div>
  )
}

export function GoalBar({ fills, label }) {
  const slots = Math.max(WEEKLY_GOAL.max, fills.length)
  return (
    <div className="flex gap-0.5" role="img" aria-label={label}>
      {Array.from({ length: slots }, (_, i) => (
        <div
          key={i}
          className={`flex-1 h-2.5 rounded transition-colors ${
            fills[i] ?? (i < WEEKLY_GOAL.min ? 'bg-stone-200' : 'border border-dashed border-stone-300')
          }`}
        />
      ))}
    </div>
  )
}
