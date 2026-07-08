// Returns the target rep count for a given week given a range like "6–8"
export function getTargetReps(repsStr, week) {
  const parts = repsStr.split('–')
  if (parts.length < 2) return null
  const low = parseInt(parts[0])
  const high = parseInt(parts[1])
  if (isNaN(low) || isNaN(high)) return null

  if (week === 12) return low // deload: low end
  const cycleWeek = ((week - 1) % 4) + 1
  if (cycleWeek === 1) return low
  if (cycleWeek === 2) return Math.min(low + 1, high)
  if (cycleWeek === 3) return Math.min(low + 2, high)
  return high
}
