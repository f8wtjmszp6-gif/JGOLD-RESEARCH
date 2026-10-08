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
