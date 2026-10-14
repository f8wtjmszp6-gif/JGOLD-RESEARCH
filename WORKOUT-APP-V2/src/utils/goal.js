// Progress toward a goal on the card's 0–4 scale: reaching the min reads as 3
// (goal met), the max as 4, and below the min it climbs in steps.
export function goalLevel(count, goal) {
  if (count >= goal.max) return 4
  if (count >= goal.min) return 3
  return Math.min(2, Math.floor((3 * count) / goal.min))
}

// A single green for every filled slot, deepening with the count.
const FILLS = ['bg-emerald-300', 'bg-emerald-300', 'bg-emerald-400', 'bg-emerald-500', 'bg-emerald-600']
export function goalFill(count) {
  return FILLS[Math.min(count, FILLS.length - 1)]
}

// Today's short name and the days left in the calendar week (Sun–Sat,
// today included).
export function weekDay(now = new Date()) {
  return {
    day: now.toLocaleDateString('en-US', { weekday: 'short' }),
    daysLeft: 7 - now.getDay(),
  }
}
