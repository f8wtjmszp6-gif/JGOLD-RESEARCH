// What each kind of logged thing counts as on the week strip and the day
// pickers: its tab, and that tab's dot color.

// The four tabs in key order, each with its dot color. A day gets a dot for
// every tab it covered.
export const TABS = [
  ['gym', 'Gym', 'bg-red-500'],
  ['cardio', 'Cardio', 'bg-cyan-500'],
  ['stretch', 'Stretch', 'bg-violet-500'],
  ['rest', 'Rest', 'bg-stone-400'],
]
export const TAB_DOT = Object.fromEntries(TABS.map(([k, , dot]) => [k, dot]))
// Each kind of thing and the tab it counts toward.
const KINDS = {
  plan: 'gym',
  full: 'gym',
  class: 'gym',
  walk: 'cardio',
  cardio: 'cardio',
  sport: 'cardio',
  stretch: 'stretch',
  rest: 'rest',
}
// The tabs a day covered, in key order. A class also counts for cardio and
// stretching when it had them.
export const tabsOf = items => {
  const hit = new Set(items.flatMap(x => [KINDS[x.kind], ...(x.tags ?? []).filter(t => t.kind !== 'strength').map(t => t.kind)]))
  return TABS.filter(([k]) => hit.has(k)).map(([k]) => k)
}
