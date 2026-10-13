// The days of this calendar week, Monday to Sunday — at noon, so a time
// zone or daylight-saving change never tips one into the next day.
export function weekDays(now = new Date()) {
  const mon = new Date(now)
  mon.setHours(12, 0, 0, 0)
  mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return d
  })
}

export function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// "Mon", or "Earlier" for something logged before days were saved.
export function dayLabel(at) {
  return at ? new Date(at).toLocaleDateString('en-US', { weekday: 'short' }) : 'Earlier'
}

// Logged items in day order (undated ones first), each with its place in
// its own list so it can be edited.
export function inDayOrder(list) {
  return list.map((entry, index) => ({ entry, index })).sort((a, b) => (a.entry.at ?? '').localeCompare(b.entry.at ?? ''))
}

const short = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const mondayDate = weekStart => {
  const [y, m, d] = weekStart.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

// A calendar week by its Monday ("YYYY-MM-DD"): "Sep 29 – Oct 5", or
// "Oct 6 – 12" within one month.
export function weekRange(weekStart) {
  const mon = mondayDate(weekStart)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return mon.getMonth() === sun.getMonth() ? `${short(mon)} – ${sun.getDate()}` : `${short(mon)} – ${short(sun)}`
}

// "Last week", "3 weeks ago".
export function weeksAgo(weekStart, now = new Date()) {
  const n = Math.round((weekDays(now)[0] - mondayDate(weekStart)) / (7 * 86400000))
  return n === 1 ? 'Last week' : `${n} weeks ago`
}
