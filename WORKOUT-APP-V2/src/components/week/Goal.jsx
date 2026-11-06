// A weekly goal as a small tile on the This week card, three to a row: its
// name, the count against the minimum ("2/3", or "4 ✓" once it's met), and
// a slim bar under it. `goal` is { min, max }.

// Workouts and stretching: one slot per session. Slots up to the minimum are
// solid, the slots up to the max dashed (the stretch target); going past the
// max adds slots rather than hiding them.
export function GoalTile({ label, count, fills, goal }) {
  return (
    <Tile label={label} value={count} goal={goal}>
      <GoalBar fills={fills} goal={goal} label={`${label}: ${count} of a ${goal.min}–${goal.max} goal`} />
    </Tile>
  )
}

// Cardio minutes against the max, with a tick at the minimum.
export function CardioTile({ minutes, fill, goal }) {
  const pct = m => `${Math.min(100, (m / goal.max) * 100)}%`
  return (
    <Tile label="Cardio" value={minutes} goal={goal}>
      <div
        className="relative h-1.5 rounded bg-stone-200"
        role="img"
        aria-label={`Cardio: ${minutes} of ${goal.max} minutes, ${goal.min} minimum`}
      >
        <div className={`h-full rounded transition-all duration-500 ${fill}`} style={{ width: pct(minutes) }} />
        {goal.min < goal.max && (
          <div className="absolute -top-0.5 -bottom-0.5 w-0.5 rounded-full bg-white/90" style={{ left: pct(goal.min) }} />
        )}
      </div>
    </Tile>
  )
}

function Tile({ label, value, goal, children }) {
  return (
    <div className="min-w-0 rounded-xl bg-stone-50 px-2.5 py-2">
      <p className="text-xs font-medium text-stone-500 truncate">{label}</p>
      <p className="mt-0.5 mb-1.5 whitespace-nowrap">
        <span className="text-[15px] font-bold text-stone-900 tabular-nums">{value}</span>
        {value >= goal.min
          ? <span className="text-xs font-bold text-emerald-700 ml-0.5">✓</span>
          : <span className="text-xs font-medium text-stone-400">/{goal.min}</span>}
      </p>
      {children}
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
          className={`flex-1 h-1.5 rounded transition-colors ${
            fills[i] ?? (i < goal.min ? 'bg-stone-200' : 'border border-dashed border-stone-300')
          }`}
        />
      ))}
    </div>
  )
}
