// What a lift is tracked by in a given week, for Trends and new bests:
//   hold → longest hold (s) · weighted → weight (lb; less is better when
//   assisted) · bodyweight → best set (reps)
export function metric(lift) {
  if (!lift?.sets?.length) return null
  if (lift.mode === 'hold') return { v: Math.max(...lift.sets), unit: 's', better: 1 }
  if (lift.weight > 0) return { v: lift.weight, unit: 'lb', better: lift.assist ? -1 : 1, assist: lift.assist }
  return { v: Math.max(...lift.sets), unit: 'reps', better: 1 }
}
