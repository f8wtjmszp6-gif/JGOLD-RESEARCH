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

// A single green for every filled slot, deepening with the count.
const FILLS = ['bg-emerald-300', 'bg-emerald-300', 'bg-emerald-400', 'bg-emerald-500', 'bg-emerald-600']
export function goalFill(count) {
  return FILLS[Math.min(count, FILLS.length - 1)]
}
