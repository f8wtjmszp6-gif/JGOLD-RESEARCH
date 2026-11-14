import { useState } from 'react'
import { InfoSheet } from '../ui/InfoMark'
import { InfoIcon } from '../ui/glyphs'
import { coverage, coversOf, primaryOf } from '../../data/exercises'
import { MUSCLES, muscleName } from '../../utils/muscles'
import { MUSCLE_LABEL } from '../../data/targeted'
import { openDemo } from '../../data/howto'

// How many of a list's areas it covers, as a pill on its heading: a green
// ✓ once all are covered, or orange "3 of 4 areas" while one is missing.
// Tap it for which areas count. `given`: areas worked out elsewhere (a
// list's stretches), with `noun` for what fills one.
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
          text={all ? (noun === 'stretch' ? 'Every area has its own stretch.' : 'Every area this part should hit has its own exercise.') : missingText(missing, noun)}
          onClose={() => setOpen(false)}
        >
          <ul className="space-y-2 text-sm">
            {areas.map(a => (
              <li key={a.id} className="flex items-center gap-3">
                <span className={`w-4 text-center font-bold ${a.covered ? 'text-emerald-600' : 'text-orange-500'}`}>{a.covered ? '✓' : '–'}</span>
                <span className={`shrink-0 ${a.covered ? 'text-stone-700' : 'text-stone-400'}`}>{a.label}</span>
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

const missingText = (missing, noun) => `Missing ${listOf(missing)}. Add ${noun === 'stretch' ? 'a stretch' : 'an exercise'} to fill the gap.`

// A workout's ⓘ in its header: green once everything is covered, orange
// while something's missing. Its pop-up has a part each (`parts`: { key,
// label, areas, list, noun, listLabel }), picked with a switch when there's
// more than one (starting on `start`): the areas covered, then what's in it.
// `title`: the pop-up's name (Overview).
export function CoverageHead({ parts, start, title = 'Overview' }) {
  const [open, setOpen] = useState(false)
  const shown = parts.filter(p => p.areas.length)
  const [key, setKey] = useState(start)
  if (!shown.length) return null
  const part = shown.find(p => p.key === key) ?? shown[0]
  const all = shown.every(p => p.areas.every(a => a.covered))
  const covered = part.areas.filter(a => a.covered).length
  const partAll = covered === part.areas.length
  return (
    <>
      <button onClick={() => { setKey(start); setOpen(true) }} aria-label={all ? 'All areas covered' : 'Areas covered (some missing)'}
        className={`w-9 h-9 rounded-full flex items-center justify-center active:opacity-70 ${all ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
        <InfoIcon size={17} />
      </button>
      {open && (
        <InfoSheet
          title={title}
          // What's missing goes under Coverage.
          text={null}
          // A fixed height, so switching parts doesn't resize it.
          tall={shown.length > 1}
          onClose={() => setOpen(false)}
        >
          {shown.length > 1 && (
            <div className="flex rounded-xl bg-stone-100 p-1" role="radiogroup" aria-label="Exercises or stretches">
              {shown.map(p => (
                <button key={p.key} role="radio" aria-checked={p.key === part.key} onClick={() => setKey(p.key)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-semibold ${p.key === part.key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`}>
                  {p.label}
                  {/* Green ✓ when that part covers every area, orange ! when one's missing. */}
                  {p.areas.every(x => x.covered)
                    ? <span className="ml-1.5 text-emerald-600 font-bold" aria-label="all areas covered">✓</span>
                    : <span className="ml-1.5 text-orange-500 font-bold" aria-label="an area is missing">!</span>}
                </button>
              ))}
            </div>
          )}
          {/* Coverage, what's missing and the areas, close together. */}
          <div className="space-y-1.5">
            {/* Headed like In this plan below. */}
            <p className="text-sm font-semibold text-stone-900">Coverage</p>
            {!partAll && (
              <p className="text-sm text-stone-600 leading-relaxed">{missingText(part.areas.filter(a => !a.covered).map(a => a.label), part.noun)}</p>
            )}
            <ul className="pt-1 space-y-2 text-sm">
              {part.areas.map(a => (
                <li key={a.id} className="flex items-center gap-3">
                  <span className={`w-4 text-center font-bold ${a.covered ? 'text-emerald-600' : 'text-orange-500'}`}>{a.covered ? '✓' : '–'}</span>
                  <span className={a.covered ? 'text-stone-700' : 'text-stone-400'}>{a.label}</span>
                </li>
              ))}
            </ul>
          </div>
          {part.list.filter(Boolean).length > 0 && (
            <div className="space-y-2">
              <p className="pt-1 text-sm font-semibold text-stone-900">{part.listLabel}</p>
              {/* Like Add an exercise: a box per muscle group, each row "Muscle:
                  name" with ⓘ for how to do it. */}
              {groupsOf(part.list, part.areas, part.noun).map(([g, rows]) => (
                <div key={g} className="rounded-xl bg-stone-50 overflow-hidden divide-y divide-stone-100">
                  <p className="px-3.5 pt-3 pb-1 text-xs uppercase tracking-wider font-medium text-stone-400">{g}</p>
                  {rows.map(([x, m]) => (
                    <div key={x.id} className="flex items-center">
                      <p className="flex-1 min-w-0 pl-3.5 pr-1 py-2.5 text-sm text-stone-800">
                        <span className="font-medium text-stone-400">{muscleName(m)}: </span>
                        <span className="font-semibold">{x.name}</span>
                      </p>
                      <button onClick={() => openDemo(x.name, part.noun)} aria-label={`How to do ${x.name}`}
                        className="w-10 h-10 mr-1 rounded-lg flex items-center justify-center shrink-0 text-stone-400 active:bg-stone-100">
                        <InfoIcon />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </InfoSheet>
      )}
    </>
  )
}

// A list's exercises by muscle group, as Add an exercise shows them: each
// under the muscle it covers for the list (else the one it mainly works).
function groupsOf(list, areas, noun) {
  // Only a muscle (not a whole group, as Full Body goes by) names the row.
  const covering = Object.fromEntries(areas.filter(a => a.by && MUSCLE_LABEL[a.id]).map(a => [a.by.id, a.id]))
  const groups = new Map()
  for (const x of list.filter(Boolean)) {
    const m = covering[x.id] ?? (noun === 'stretch' ? x.muscles?.[0] : primaryOf(x)[0] ?? coversOf(x)[0]) ?? 'other'
    const g = Object.keys(MUSCLES).find(k => MUSCLES[k].includes(m)) ?? 'other'
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g).push([x, m])
  }
  return [...groups].map(([g, rows]) => [g[0].toUpperCase() + g.slice(1), rows])
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
