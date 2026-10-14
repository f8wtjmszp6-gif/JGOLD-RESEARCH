import { coverage } from '../../data/exercises'

// How many of a list's areas it covers, as a pill on its heading: green
// "All 4 areas ✓", or orange "3 of 4 areas" while one is missing.
export function CoveragePill({ list, area }) {
  const areas = coverage(list, area)
  if (!areas.length) return null
  const covered = areas.filter(a => a.covered).length
  const all = covered === areas.length
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${all ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
      {all ? `All ${areas.length} areas ✓` : `${covered} of ${areas.length} areas`}
    </span>
  )
}

// An orange row for each area the list is missing; tapping it opens the bank,
// where exercises that fill the gap come first.
export function GapRows({ list, area, onAdd }) {
  return coverage(list, area).filter(a => !a.covered).map(a => (
    <button
      key={a.id}
      onClick={onAdd}
      className="w-full flex items-center gap-2 rounded-2xl border-[1.5px] border-dashed border-orange-300 bg-orange-50 px-4 py-3 text-left active:opacity-70"
    >
      <span className="text-orange-700 text-xl leading-none">+</span>
      <span className="font-semibold text-orange-700">Add an exercise for {a.label.toLowerCase()}</span>
    </button>
  ))
}

// A dashed "+ Add …" row at the end of a list.
export function AddRow({ label, note, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 rounded-2xl border-[1.5px] border-dashed border-stone-300 px-4 py-3 text-left active:bg-stone-100"
    >
      <span className="text-accent-500 text-xl leading-none">+</span>
      <span className="font-semibold text-stone-500">{label}</span>
      {note && <span className="ml-auto text-xs text-stone-400">{note}</span>}
    </button>
  )
}
