import { useState } from 'react'
import { InfoSheet } from '../ui/InfoMark'
import { coverage } from '../../data/exercises'

// How many of a list's areas it covers, as a pill on its heading: a green
// ✓ once all are covered, or orange "3 of 4 areas" while one is missing.
// Tap it for which areas count.
// `given`: areas worked out elsewhere (a list's stretches), with `noun` for
// what fills one.
export function CoveragePill({ list, area, given, noun = 'exercise' }) {
  const [open, setOpen] = useState(false)
  const areas = given ?? coverage(list, area)
  if (!areas.length) return null
  const covered = areas.filter(a => a.covered).length
  const all = covered === areas.length
  const missing = areas.filter(a => !a.covered).map(a => a.label)
  const pill = (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${all ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
      {all ? '✓' : `${covered} of ${areas.length} areas`}
    </span>
  )
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label={all ? 'All areas covered' : undefined} className="active:opacity-70">
        {pill}
      </button>
      {open && (
        <InfoSheet
          icon={all && pill}
          title={all ? 'All areas covered' : `${covered} of ${areas.length} areas covered`}
          text={noun === 'stretch'
            ? (all ? 'Every area has its own stretch.' : `Missing ${listOf(missing)}. Add a stretch to fill the gap.`)
            : (all ? 'Every area this part should hit has its own exercise.' : `Missing ${listOf(missing)}. Add an exercise to fill the gap.`)}
          onClose={() => setOpen(false)}
        >
          <ul className="space-y-2 text-sm">
            {areas.map(a => (
              <li key={a.id} className="flex items-center gap-3">
                <span className={`w-4 text-center font-bold ${a.covered ? 'text-emerald-600' : 'text-orange-500'}`}>{a.covered ? '✓' : '–'}</span>
                <span className={`shrink-0 ${a.covered ? 'text-stone-700' : 'text-stone-400'}`}>{a.label}</span>
                {/* A muscle group says how many work it; a muscle names what covers it. */}
                <span className="ml-auto min-w-0 truncate text-right text-stone-400">
                  {a.group ? (a.count ? `${a.count} ${a.count > 1 ? (noun === 'stretch' ? 'stretches' : 'exercises') : noun}` : 'Nothing yet') : a.by ? a.by.name : 'Nothing yet'}
                </span>
              </li>
            ))}
          </ul>
        </InfoSheet>
      )}
    </>
  )
}

const listOf = xs => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`).toLowerCase()

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
