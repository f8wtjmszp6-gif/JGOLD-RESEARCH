// Number and label formatting shared by the workout screens.

// 12 → "12", 2.5 → "2.5", 1/3 → "0.33"
export const fmt = n => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100))

// − / + move to the next round number: 5s on a barbell, 2.5s otherwise.
export const stepTo = (v, step, dir) => Math.max(0, (dir > 0 ? Math.floor(v / step + 1e-9) + 1 : Math.ceil(v / step - 1e-9) - 1) * step)

// One warm-up set, as "5 min easy".
export const warmupSetLabel = x => `${x.minutes} min ${x.hard ? 'hard' : 'easy'}`

// The weight as the card shows it under the name, by equipment.
export function loadSummary(equipment, log) {
  const w = `${fmt(log.weight)} lbs`
  if (equipment === 'bodyweight') return log.weight > 0 ? `Bodyweight + ${w}` : 'Bodyweight'
  if (equipment === 'assisted') return `Assisted · ${w}`
  if (equipment === 'barbell' && log.bar > 0 && log.weight > log.bar) return `${w} · ${fmt((log.weight - log.bar) / 2)} lb/side`
  return w
}
