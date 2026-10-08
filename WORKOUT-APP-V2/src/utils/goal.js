// Each step toward the goal greens the card a little more — goal met (3)
// reads clearly green, the stretch target (4+) deepest.
const TINTS = [
  'bg-white border-transparent',
  'bg-emerald-50/40 border-emerald-100',
  'bg-emerald-50 border-emerald-200',
  'bg-emerald-100/60 border-emerald-300',
  'bg-emerald-100 border-emerald-400',
]
export function goalTint(count) {
  return TINTS[Math.min(count, TINTS.length - 1)]
}

// Cardio minutes on the same 0–4 scale: the 150 minimum reads as 3 (goal
// met), the 300 ideal as 4.
export function cardioLevel(minutes) {
  return minutes >= 300 ? 4 : Math.min(3, Math.floor(minutes / 50))
}

// A single green for every filled slot, deepening with the count.
const FILLS = ['bg-emerald-300', 'bg-emerald-300', 'bg-emerald-400', 'bg-emerald-500', 'bg-emerald-600']
export function goalFill(count) {
  return FILLS[Math.min(count, FILLS.length - 1)]
}

// What's left this week: the day, days left in the calendar week (Mon–Sun,
// today included), and what's still needed to reach each weekly minimum —
// 3 workouts, 3 stretch sessions, 150 cardio minutes.
export function weekLeft({ workouts, stretches, cardio }, goals, now = new Date()) {
  const daysLeft = 7 - ((now.getDay() + 6) % 7)
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
  const needs = []
  if (workouts < goals.workouts) needs.push(plural(goals.workouts - workouts, 'more workout', 'more workouts'))
  if (stretches < goals.stretches) needs.push(plural(goals.stretches - stretches, 'stretch session', 'stretch sessions'))
  if (cardio !== null && cardio < goals.cardio) needs.push(`${goals.cardio - cardio} cardio min`)
  return {
    day: now.toLocaleDateString('en-US', { weekday: 'short' }),
    daysLeft,
    needs,
  }
}

// "a, b and c"
export function listJoin(items) {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}
