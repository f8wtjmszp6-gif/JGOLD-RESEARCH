// What a lift is tracked by in a given week, for Trends and new bests:
//   hold → longest hold (s) · weighted → weight (lb; less is better when
//   assisted) · bodyweight → best set (reps)
// Split cards count too: their sets go in the longest hold or best set, and
// the weight is the average over every ticked set, each at its own weight.
export function metric(lift) {
  const groups = [{ weight: lift?.weight ?? 0, sets: lift?.sets ?? [] }, ...(lift?.splits ?? [])].filter(g => g.sets.length)
  if (!groups.length) return null
  const sets = groups.flatMap(g => g.sets)
  if (lift.mode === 'hold') return { v: Math.max(...sets), unit: 's', better: 1 }
  const weight = groups.reduce((n, g) => n + g.weight * g.sets.length, 0) / sets.length
  if (weight > 0) return { v: Math.round(weight * 10) / 10, unit: 'lb', better: lift.assist ? -1 : 1, assist: lift.assist }
  return { v: Math.max(...sets), unit: 'reps', better: 1 }
}
