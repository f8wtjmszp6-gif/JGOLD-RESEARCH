// What each kind of logged thing counts as on the week strip and the day
// pickers: its tab (and that tab's dot color), and the tile behind its icon.

// The four tabs in key order, each with its dot color. A day gets a dot for
// every tab it covered.
export const TABS = [
  ['gym', 'Gym', 'bg-red-500'],
  ['cardio', 'Cardio', 'bg-cyan-500'],
  ['stretch', 'Stretch', 'bg-violet-500'],
  ['rest', 'Rest', 'bg-stone-400'],
]
export const TAB_DOT = Object.fromEntries(TABS.map(([k, , dot]) => [k, dot]))
// Each kind of thing: its tab, then (tapping a day) the color of its card's tile.
const KINDS = {
  plan: ['gym', 'bg-red-50'],
  full: ['gym', 'bg-orange-50'],
  class: ['gym', 'bg-violet-50'],
  walk: ['cardio', 'bg-emerald-50'],
  cardio: ['cardio', 'bg-cyan-50'],
  sport: ['cardio', 'bg-lime-50'],
  stretch: ['stretch', 'bg-teal-50'],
  rest: ['rest', 'bg-indigo-50'],
}
// The tabs a day covered, in key order. A class also counts for cardio and
// stretching when it had them.
export const tabsOf = items => {
  const hit = new Set(items.flatMap(x => [KINDS[x.kind][0], ...(x.tags ?? []).filter(t => t.kind !== 'strength').map(t => t.kind)]))
  return TABS.filter(([k]) => hit.has(k)).map(([k]) => k)
}
export const TILE = Object.fromEntries(Object.entries(KINDS).map(([k, [, tile]]) => [k, tile]))
