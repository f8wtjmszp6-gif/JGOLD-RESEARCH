// The days of this calendar week, Sunday to Saturday — at noon, so a time
// zone or daylight-saving change never tips one into the next day.
export function weekDays(now = new Date()) {
  const first = new Date(now)
  first.setHours(12, 0, 0, 0)
  first.setDate(first.getDate() - first.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(first)
    d.setDate(first.getDate() + i)
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
const startDate = weekStart => {
  const [y, m, d] = weekStart.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

// A calendar week by its Sunday ("YYYY-MM-DD"): "Sep 28 – Oct 4", or
// "Oct 11 – 17" within one month.
export function weekRange(weekStart) {
  const first = startDate(weekStart)
  const last = new Date(first)
  last.setDate(first.getDate() + 6)
  return first.getMonth() === last.getMonth() ? `${short(first)} – ${last.getDate()}` : `${short(first)} – ${short(last)}`
}

// "Last week", "3 weeks ago".
export function weeksAgo(weekStart, now = new Date()) {
  const n = Math.round((weekDays(now)[0] - startDate(weekStart)) / (7 * 86400000))
  return n === 1 ? 'Last week' : `${n} weeks ago`
}

// "Wednesday"
export const weekdayOf = at => new Date(at).toLocaleDateString('en-US', { weekday: 'long' })
