// A weekly goal as a row on the This week card: label, bar, and the count
// against the minimum ("2/3"), which turns into a ✓ once it's met.
// `goal` is { min, max }.

// Workouts and stretching: one slot per session. Slots up to the minimum are
// solid, the slots up to the max dashed (the stretch target); going past the
// max adds slots rather than hiding them.
export function GoalRow({ label, count, fills, goal }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[74px] text-sm font-semibold text-stone-700 shrink-0">{label}</span>
      <div className="flex-1">
        <GoalBar fills={fills} goal={goal} label={`${label}: ${count} of a ${goal.min}–${goal.max} goal`} />
      </div>
      <Count value={count} goal={goal} />
    </div>
  )
}

function Count({ value, goal }) {
  return (
    <span className="w-14 text-right shrink-0 whitespace-nowrap">
      <span className="text-[15px] font-semibold text-stone-900">{value}</span>
      {value >= goal.min
        ? <span className="text-xs font-bold text-emerald-700 ml-0.5">✓</span>
        : <span className="text-xs font-medium text-stone-400">/{goal.min}</span>}
    </span>
  )
}

// Cardio minutes against the max, with a tick at the minimum.
export function CardioRow({ minutes, fill, goal }) {
  const pct = m => `${Math.min(100, (m / goal.max) * 100)}%`
  return (
    <div className="flex items-center gap-3">
      <span className="w-[74px] text-sm font-semibold text-stone-700 shrink-0">Cardio</span>
      <div
        className="flex-1 relative h-2.5 rounded bg-stone-200"
        role="img"
        aria-label={`Cardio: ${minutes} of ${goal.max} minutes, ${goal.min} minimum`}
      >
        <div className={`h-full rounded transition-all duration-500 ${fill}`} style={{ width: pct(minutes) }} />
        {goal.min < goal.max && (
          <div className="absolute -top-0.5 -bottom-0.5 w-0.5 rounded-full bg-white/90" style={{ left: pct(goal.min) }} />
        )}
      </div>
      <Count value={minutes} goal={goal} />
    </div>
  )
}

function GoalBar({ fills, goal, label }) {
  const slots = Math.max(goal.max, fills.length)
  return (
    <div className="flex gap-0.5" role="img" aria-label={label}>
      {Array.from({ length: slots }, (_, i) => (
        <div
          key={i}
          className={`flex-1 h-2.5 rounded transition-colors ${
            fills[i] ?? (i < goal.min ? 'bg-stone-200' : 'border border-dashed border-stone-300')
          }`}
        />
      ))}
    </div>
  )
}
