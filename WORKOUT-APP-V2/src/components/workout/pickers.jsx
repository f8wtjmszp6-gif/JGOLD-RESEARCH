import { Fragment, useState } from 'react'
import { STRETCH_ROUTINE, MUSCLE_GROUPS } from '../../data/workout'
import { EXERCISE_BANK, SUGGESTED_GROUPS, fitsPlan, isCore, ratingFor, coverage, coversOf } from '../../data/exercises'
import { HowToBody } from './HowTo'
import { STRETCH_BANK, STRETCH_AREAS, SUGGESTED_AREAS, stretchFits, stretchRating } from '../../data/stretches'
import { InfoIcon } from '../ui/glyphs'
import { SettingsSheet } from '../ui/Sheet'

// The stretches that fit the list and aren't in it yet, by body area, best
// first, starting with the areas this workout works.
export function StretchPicker({ listId, store, onPick, onClose }) {
  return (
    <BankPicker
      title="Add a stretch"
      noun="stretches"
      kind="stretch"
      sections={STRETCH_AREAS}
      sectionOf={x => x.area}
      bank={STRETCH_BANK.filter(x => stretchFits(x, listId))}
      rate={x => stretchRating(x, listId)}
      exclude={store.getStretches(listId).map(x => x.id)}
      current={store.getStretches(listId)}
      currentLabel={listId === STRETCH_ROUTINE.id ? 'In the routine' : 'In these stretches'}
      first={SUGGESTED_AREAS[listId] ?? []}
      onPick={onPick}
      onClose={onClose}
    />
  )
}

// The same for exercises, by the muscle group Trends files them under.
// Only exercises that fit: for the main list, what the plan is for; for the
// Core section, core exercises.
// Exercises that cover an area the list is missing are marked "Fills" and
// listed first.
export function ExercisePicker({ workoutId, store, section, onPick, onClose }) {
  const core = section === 'core'
  const area = core ? 'core' : workoutId
  const sections = store.getExerciseSections(workoutId)
  const list = core ? sections.core : sections.main
  const missing = coverage(list, area).filter(a => !a.covered)
  const fills = x => missing.filter(a => coversOf(x).includes(a.id)).map(a => a.label)
  const names = missing.map(a => a.label).join(' and ')

  return (
    <BankPicker
      fills={fills}
      banner={missing.length ? `Not covered yet: ${names}. Exercises marked Fills cover it.` : null}
      title={core ? 'Add a core exercise' : 'Add an exercise'}
      noun="exercises"
      kind="exercise"
      sections={MUSCLE_GROUPS}
      sectionOf={x => x.group}
      bank={EXERCISE_BANK.filter(x => (core ? isCore(x) : fitsPlan(x, workoutId)))}
      rate={x => ratingFor(x, core ? 'core' : workoutId)}
      exclude={store.getExercises(workoutId).map(x => x.id)}
      current={list}
      currentLabel={core ? 'In your core section' : 'In this workout'}
      countLabel={core ? 'in core' : 'in workout'}
      first={core ? [] : SUGGESTED_GROUPS[workoutId] ?? []}
      onPick={onPick}
      onClose={onClose}
    />
  )
}

// A bank, one group at a time. Tabs pick the group (suggested first; groups
// with something that fills a gap before those). Each tab lists what's already
// in the list from that group, then the bank's Recommended picks for it, and
// "Show more" adds the rest under plain headings instead of grades.
// Search looks through every group.
const TIERS = [
  [3, g => `Recommended for ${g}`],
  [2, (g, kind) => `Also ${kind === 'stretch' ? 'stretches' : 'works'} ${g}`],
  [1, (g, kind) => `${kind === 'stretch' ? 'Stretches' : 'Hits'} ${g} less directly`],
]
const SEARCH_TIERS = { 3: 'Recommended', 2: 'Also works', 1: 'Less direct' }

function BankPicker({ title, noun, kind, sections, sectionOf, bank, exclude, current, currentLabel, countLabel = 'added', first, rate, fills, banner, onPick, onClose }) {
  const [query, setQuery] = useState('')
  const [info, setInfo] = useState(null) // the item whose how-to is open
  const [more, setMore] = useState(false)
  const skip = new Set(exclude)
  const q = query.trim().toLowerCase()
  const rank = x => (first.includes(x.id) ? first.indexOf(x.id) : first.length)
  const fillCount = x => fills?.(x).length ?? 0
  const order = list => [...list].sort((a, b) => fillCount(b) - fillCount(a))
  const left = bank.filter(x => !skip.has(x.id))
  const tabs = [...sections]
    .sort((a, b) => rank(a) - rank(b))
    .filter(sec => left.some(x => sectionOf(x) === sec.id) || current.some(x => sectionOf(x) === sec.id))
    .sort((a, b) => Number(left.some(x => sectionOf(x) === b.id && fillCount(x))) - Number(left.some(x => sectionOf(x) === a.id && fillCount(x))))
  const [tab, setTab] = useState(() => tabs[0]?.id)
  const sec = tabs.find(s => s.id === tab) ?? tabs[0]
  const group = sec?.label.toLowerCase()

  function pickTab(id) {
    setTab(id)
    setMore(false)
    setInfo(null)
  }

  // One row: name (with "Fills"), ✓ if it's already in, ⓘ.
  function row(x, have) {
    const name = (
      <span className="min-w-0">
        <span className={have ? 'font-semibold text-emerald-900' : ''}>{x.name}</span>
        {!have && fillCount(x) > 0 && <span className="block text-xs font-semibold text-emerald-700 mt-0.5">Fills: {fills(x).join(', ')}</span>}
      </span>
    )
    return (
      <div key={x.id} className={have ? 'bg-emerald-50' : ''}>
        <div className="flex items-center">
          {have ? (
            <div className="flex-1 min-w-0 flex items-center justify-between gap-2 pl-3.5 pr-1 py-2.5 text-sm text-stone-800">
              {name}
              <span className="text-emerald-700 font-bold" aria-label={`${x.name} is added`}>✓</span>
            </div>
          ) : (
            <button onClick={() => onPick(x.id)} className="flex-1 min-w-0 flex items-center pl-3.5 pr-1 py-2.5 text-left text-sm text-stone-800 active:bg-stone-100">
              {name}
            </button>
          )}
          <button
            onClick={() => setInfo(info === x.id ? null : x.id)}
            aria-label={`How to do ${x.name}`}
            aria-expanded={info === x.id}
            className={`w-10 h-10 mr-1 rounded-lg flex items-center justify-center shrink-0 active:bg-stone-100 ${info === x.id ? 'text-accent-500' : 'text-stone-400'}`}
          >
            <InfoIcon />
          </button>
        </div>
        {info === x.id && (
          <div className="px-3.5 pb-3.5">
            <HowToBody item={x} kind={kind} />
            {!have && (
              <button
                onClick={() => onPick(x.id)}
                className="mt-3 w-full py-2.5 rounded-xl bg-accent-500 text-white text-sm font-semibold active:bg-accent-600 transition-colors"
              >
                Add this
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  const heading = (children, green) => (
    <p className={`px-3.5 pt-3 pb-1 text-xs uppercase tracking-wider font-medium ${green ? 'text-emerald-700' : 'text-stone-400'}`}>{children}</p>
  )
  const box = 'rounded-xl bg-stone-50 overflow-hidden divide-y divide-stone-100'

  let body
  if (q) {
    const hits = left.filter(x => x.name.toLowerCase().includes(q))
    body = hits.length === 0
      ? <p className="text-sm text-stone-400">No {noun} match “{query}”.</p>
      : (
        <div className={box}>
          {[3, 2, 1].map(r => {
            const rows = order(hits.filter(x => rate(x) === r))
            return rows.length > 0 && (
              <Fragment key={r}>
                {heading(SEARCH_TIERS[r], r === 3)}
                {rows.map(x => row(x))}
              </Fragment>
            )
          })}
        </div>
      )
  } else if (sec) {
    const mine = current.filter(x => sectionOf(x) === sec.id)
    const inTab = left.filter(x => sectionOf(x) === sec.id)
    const tiers = TIERS.map(([r, label]) => [r, label(group, kind), order(inTab.filter(x => rate(x) === r))])
    // Anything that fills a gap shows without "Show more", whatever its tier.
    const extra = inTab.filter(x => rate(x) < 3 && !fillCount(x)).length
    body = (
      <div className={box}>
        {mine.length > 0 && (
          <>
            {heading(currentLabel)}
            {mine.map(x => row(x, true))}
          </>
        )}
        {tiers.map(([r, label, rows]) => {
          const shown = r === 3 || more ? rows : rows.filter(x => fillCount(x))
          return shown.length > 0 && (
            <Fragment key={r}>
              {heading(label, r === 3)}
              {shown.map(x => row(x))}
            </Fragment>
          )
        })}
        {tiers[0][2].length === 0 && !more && (
          <p className="px-3.5 py-2.5 text-sm text-stone-400">The recommended {noun} for {group} are all in.</p>
        )}
        {(extra > 0 || more) && (
          <button onClick={() => setMore(!more)} className="w-full px-3.5 py-3 text-left text-sm font-semibold text-accent-500 active:bg-stone-100">
            {more ? 'Show fewer' : `Show ${extra} more`}
          </button>
        )}
      </div>
    )
  }

  return (
    <SettingsSheet title={title} closeLabel="Cancel" tall onClose={onClose}>
      <input
        id="bank-search"
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={`Search ${noun}`}
        className="w-full rounded-xl bg-stone-100 px-3.5 py-2.5 text-base text-stone-900 placeholder:text-stone-400 outline-none select-text"
      />
      {banner && <p className="rounded-xl bg-orange-50 text-orange-700 text-sm px-3.5 py-2.5 leading-relaxed">{banner}</p>}
      {!q && tabs.length > 1 && (
        <div className="-mx-1 px-1 overflow-x-auto">
          <div className="bg-stone-100 rounded-xl p-1 flex min-w-full w-max">
            {tabs.map(s => {
              const n = current.filter(x => sectionOf(x) === s.id).length
              return (
                <button
                  key={s.id}
                  onClick={() => pickTab(s.id)}
                  className={`flex-1 whitespace-nowrap px-3 py-1.5 rounded-lg text-sm leading-tight transition-colors ${
                    s.id === sec?.id ? 'bg-white text-stone-900 shadow-sm font-semibold' : 'text-stone-500'
                  }`}
                >
                  {s.label}
                  <span className="block text-[11px] font-normal text-stone-400">{n} {countLabel}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      {body}
    </SettingsSheet>
  )
}
