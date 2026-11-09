import { Fragment, useState } from 'react'
import { STRETCH_ROUTINE, MUSCLE_GROUPS, GYM_ORDER, TARGETED, workouts } from '../../data/workout'
import { EXERCISE_BANK, EXERCISE_BY_ID, SUGGESTED_GROUPS, fitsPlan, isCore, ratingFor, ratingOn, coverage, primaryOf } from '../../data/exercises'
import { openDemo } from '../../data/howto'
import { STRETCH_BANK, STRETCH_AREAS, SUGGESTED_AREAS, stretchRating } from '../../data/stretches'
import { MUSCLE_LABEL, fitsEquipment } from '../../data/targeted'
import { InfoIcon } from '../ui/glyphs'
import { SettingsSheet } from '../ui/Sheet'
import { ChoiceMenu } from '../ui/ChoiceMenu'

// The stretches for the list and not in it yet, by body area, best first,
// starting with the areas this workout works. A list with exercises goes by
// the muscles they mainly work (see stretchRating); when one of those isn't
// stretched yet, "Fill a gap" lists what reaches it.
export function StretchPicker({ listId, store, onPick, onClose }) {
  const current = store.getStretches(listId)
  // What the main exercises work (Core has its own section, not stretches).
  const exercises = workouts[listId]?.exercises ? store.getExerciseSections(listId).main : []
  const trained = new Set(exercises.flatMap(x => (x ? primaryOf(x) : [])))
  const rate = x => stretchRating(x, listId, trained)
  const reach = x => x.muscles.filter(m => trained.has(m)).length
  const bank = STRETCH_BANK.filter(x => rate(x) > 0).sort((x, y) => rate(y) - rate(x) || reach(y) - reach(x))
  const stretched = new Set(current.flatMap(x => x.muscles))
  const missing = MUSCLE_ORDER.filter(m => trained.has(m) && !stretched.has(m)).map(m => ({ id: m, label: MUSCLE_LABEL[m] }))
  const forArea = (a, list) => list.filter(x => x.muscles.includes(a.id)).sort((x, y) => x.muscles.indexOf(a.id) - y.muscles.indexOf(a.id))
  const gap = missing.length
    ? { names: missing.map(a => a.label).join(' and '), areas: missing, forArea, fills: x => (missing.some(a => x.muscles.includes(a.id)) ? 1 : 0) }
    : null
  return (
    <BankPicker
      gap={gap}
      title="Add a stretch"
      noun="stretches"
      kind="stretch"
      sections={STRETCH_AREAS}
      sectionOf={x => x.area}
      bank={bank}
      rate={rate}
      exclude={current.map(x => x.id)}
      current={current}
      currentLabel={listId === STRETCH_ROUTINE.id ? 'In the routine' : 'In these stretches'}
      first={SUGGESTED_AREAS[listId] ?? []}
      onPick={onPick}
      onClose={onClose}
    />
  )
}
const MUSCLE_ORDER = Object.keys(MUSCLE_LABEL)

// The same for exercises, by the muscle group Trends files them under.
// Only exercises that fit: for the main list, what the plan is for; for the
// Core section, core exercises.
// When the list is missing an area, "Fill a gap" lists the exercises that
// mainly work it (best for it first); "Add an exercise" lists them all. A
// built workout offers only what fits its equipment.
export function ExercisePicker({ workoutId, store, section, onPick, onClose }) {
  const core = section === 'core'
  const area = core ? 'core' : workoutId
  const sections = store.getExerciseSections(workoutId)
  const list = core ? sections.core : sections.main
  const missing = coverage(list, area).filter(a => !a.covered)
  const names = missing.map(a => a.label).join(' and ')
  // Which of your other gym plans has it already, in the same section.
  const others = GYM_ORDER.includes(workoutId)
    ? GYM_ORDER.filter(p => p !== workoutId).map(p => {
      const other = store.getExerciseSections(p)
      return [workouts[p].short, new Set((core ? other.core : other.main).map(x => x.id))]
    })
    : []
  const elsewhere = x => others.find(([, ids]) => ids.has(x.id))?.[0]
  const bank = EXERCISE_BANK.filter(x => (core ? isCore(x) : fitsPlan(x, workoutId)) && (workoutId !== 'targeted' || fitsEquipment(x, store.targeted.eq)))
  // How well it fills what's missing: its best rating for a missing area it
  // mainly works (0: it doesn't).
  const fills = x => Math.max(0, ...missing.filter(a => primaryOf(x).includes(a.id)).map(a => ratingOn(x, a.id)))
  // Each missing area with what mainly works it, best for it first.
  const forArea = (a, list) => list.filter(x => primaryOf(x).includes(a.id)).sort((x, y) => ratingOn(y, a.id) - ratingOn(x, a.id))
  const gap = missing.length ? { names, fills, areas: missing, forArea } : null
  // Taken out for just this week (or this time): still part of it, so
  // listed with what's in it rather than offered again.
  const off = workoutId === TARGETED.id || store.past ? [] : store.weekDiff(workoutId).exercises.dropped
    .map(id => EXERCISE_BY_ID[id]).filter(x => x && isCore(x) === core)

  return (
    <BankPicker
      gap={gap}
      off={off}
      elsewhere={elsewhere}
      title={core ? 'Add a core exercise' : 'Add an exercise'}
      noun="exercises"
      kind="exercise"
      sections={MUSCLE_GROUPS}
      sectionOf={x => x.group}
      bank={bank}
      rate={x => ratingFor(x, core ? 'core' : workoutId)}
      exclude={store.getExercises(workoutId).map(x => x.id)}
      current={list}
      currentLabel="In this workout"
      countLabel={core ? 'in core' : 'in workout'}
      first={core ? [] : SUGGESTED_GROUPS[workoutId] ?? []}
      onPick={onPick}
      onClose={onClose}
    />
  )
}

// A bank, one group at a time, picked from a dropdown (suggested first).
// Each shows anything that fills a gap in the list, what's already in it
// from that group, then the bank's Recommended picks for it, and
// "Show more" adds the rest under plain headings instead of grades.
// Search looks through every group.
const TIERS = [
  [3, g => `Recommended for ${g}`],
  [2, (g, kind) => `Also ${kind === 'stretch' ? 'stretches' : 'works'} ${g}`],
  [1, (g, kind) => `${kind === 'stretch' ? 'Stretches' : 'Hits'} ${g} less directly`],
]
const SEARCH_TIERS = { 3: 'Recommended', 2: 'Also works', 1: 'Less direct' }

function BankPicker({ title, noun, kind, sections, sectionOf, bank, exclude, current, currentLabel, countLabel = 'added', first, rate, gap, off = [], elsewhere = () => null, onPick, onClose }) {
  const [query, setQuery] = useState('')
  const [more, setMore] = useState(false)
  const [showOff, setShowOff] = useState(false)
  const [tabMenu, setTabMenu] = useState(false)
  const skip = new Set([...exclude, ...off.map(x => x.id)])
  const q = query.trim().toLowerCase()
  const rank = x => (first.includes(x.id) ? first.indexOf(x.id) : first.length)
  // Fill a gap (when there's one) or Add an exercise.
  const [mode, setMode] = useState(gap ? 'gap' : 'add')
  const filling = gap && mode === 'gap'
  const [openGaps, setOpenGaps] = useState([]) // the missing areas showing all
  const left = bank.filter(x => !skip.has(x.id))
  const tabs = [...sections]
    .sort((a, b) => rank(a) - rank(b))
    .filter(sec => left.some(x => sectionOf(x) === sec.id) || current.some(x => sectionOf(x) === sec.id))
  // With a gap, it opens on the first group that can fill it.
  const [tab, setTab] = useState(() => (gap && tabs.find(t => left.some(x => sectionOf(x) === t.id && gap.fills(x) > 0))?.id) ?? tabs[0]?.id)
  const sec = tabs.find(s => s.id === tab) ?? tabs[0]
  const group = sec?.label.toLowerCase()

  function pickTab(id) {
    setTab(id)
    setMore(false)
    setOpenGaps([])
  }

  // One row: name (with "Fills"), ✓ if it's already in, ⓘ for a video demo.
  function row(x, have, note, group, struck) {
    const name = (
      <span className="min-w-0">
        {group && <span className={`font-medium ${struck ? 'text-stone-400' : 'text-emerald-700/70'}`}>{group}: </span>}
        <span className={struck ? 'text-stone-400 line-through' : have ? 'font-semibold text-emerald-900' : ''}>{x.name}</span>
        {note && <span className="block text-xs text-stone-400 mt-0.5">{note}</span>}
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
            onClick={() => openDemo(x.name, kind)}
            aria-label={`How to do ${x.name}`}
            className="w-10 h-10 mr-1 rounded-lg flex items-center justify-center shrink-0 text-stone-400 active:bg-stone-100"
          >
            <InfoIcon />
          </button>
        </div>
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
            const rows = hits.filter(x => rate(x) === r)
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
    const inTab = left.filter(x => sectionOf(x) === sec.id)
    // Recommended ones already in another of your plans go in their own
    // section, so you don't do one twice a week.
    const taken = inTab.filter(x => rate(x) === 3 && elsewhere(x))
    const tiers = TIERS.map(([r, label]) => [r, label(group, kind), inTab.filter(x => rate(x) === r && !(r === 3 && elsewhere(x)))])
    // Recommended shows its first three; the rest wait for "Show more".
    const FIRST = 3
    const extra = inTab.filter(x => rate(x) < 3).length + taken.length + Math.max(0, tiers[0][2].length - FIRST)
    // One section per missing area: its top three, then Show more.
    const fillers = filling ? gap.areas.map(a => [a, gap.forArea(a, inTab)]).filter(([, list]) => list.length) : []
    body = filling ? (
      <div className="space-y-3">
        {fillers.map(([a, list]) => {
          const all = openGaps.includes(a.id)
          return (
            <div key={a.id} className={box}>
              {heading(`Fills ${a.label.toLowerCase()}`, true)}
              {(all ? list : list.slice(0, 3)).map(x => row(x))}
              {list.length > 3 && (
                <button onClick={() => setOpenGaps(all ? openGaps.filter(id => id !== a.id) : [...openGaps, a.id])} className="w-full px-3.5 py-3 text-left text-sm font-semibold text-accent-500 active:bg-stone-100">
                  {all ? 'Show fewer' : `Show ${list.length - 3} more`}
                </button>
              )}
            </div>
          )
        })}
        {!fillers.length && <p className="text-sm text-stone-400">Nothing in {group} fills {gap.names.toLowerCase()}. Try another {kind === 'stretch' ? 'area' : 'muscle group'}.</p>}
      </div>
    ) : (
      <div className={box}>
        {tiers.map(([r, label, rows]) => {
          const shown = more ? rows : r === 3 ? rows.slice(0, FIRST) : []
          return shown.length > 0 && (
            <Fragment key={r}>
              {heading(label, r === 3)}
              {shown.map(x => row(x))}
            </Fragment>
          )
        })}
        {more && taken.length > 0 && (
          <>
            {heading('In another plan')}
            {taken.map(x => row(x, false, `In ${elsewhere(x)}`))}
          </>
        )}
        {tiers[0][2].length === 0 && !taken.length && !more && (
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
      {/* Everything already in it, whatever the group, above the picking. */}
      {!q && current.length + off.length > 0 && (
        <div className={box}>
          {heading(currentLabel)}
          {sections.flatMap(sc => current.filter(x => sectionOf(x) === sc.id).map(x => row(x, true, null, sc.label)))}
          {/* Ones taken out for now wait behind Show more. */}
          {showOff && sections.flatMap(sc => off.filter(x => sectionOf(x) === sc.id).map(x => row(x, false, null, sc.label, true)))}
          {off.length > 0 && (
            <button onClick={() => setShowOff(!showOff)} className="w-full px-3.5 py-3 text-left text-sm font-semibold text-accent-500 active:bg-stone-100">
              {showOff ? 'Show fewer' : `Show ${off.length} more`}
            </button>
          )}
        </div>
      )}
      {!q && tabs.length > 1 && (
        <div className="relative rounded-xl border border-stone-200 bg-white pl-3 pr-2.5 py-1.5 flex items-center gap-1">
          <button onClick={() => setTabMenu(true)} aria-label="Muscle group" aria-haspopup="listbox" className="absolute inset-0 w-full rounded-xl active:bg-stone-50" />
          <span className="relative flex-1 min-w-0 pointer-events-none">
            <span className="block text-[11px] font-semibold text-stone-400">{sections === MUSCLE_GROUPS ? 'Muscle group' : 'Area'}</span>
            <span className="block truncate text-[15px] font-semibold text-stone-900">
              {sec?.label} <span className="font-normal text-stone-400">· {current.filter(x => sectionOf(x) === sec?.id).length} {countLabel}</span>
            </span>
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" className="relative shrink-0 text-stone-400 pointer-events-none" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          {tabMenu && (
            <ChoiceMenu title={sections === MUSCLE_GROUPS ? 'Muscle group' : 'Area'} value={sec?.id} onPick={pickTab} onClose={() => setTabMenu(false)}
              options={tabs.map(t => [t.id, `${t.label} · ${current.filter(x => sectionOf(x) === t.id).length} ${countLabel}`])} />
          )}
        </div>
      )}
      {!q && gap && (
        <div className="flex rounded-xl bg-stone-100 p-1" role="radiogroup" aria-label={`Fill a gap or add ${kind === 'stretch' ? 'a stretch' : 'an exercise'}`}>
          {[['gap', 'Fill a gap'], ['add', kind === 'stretch' ? 'Add a stretch' : 'Add an exercise']].map(([v, text]) => (
            <button key={v} role="radio" aria-checked={mode === v} onClick={() => { setMode(v); setMore(false) }}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold ${mode === v ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`}>
              {text}
            </button>
          ))}
        </div>
      )}
      {body}
    </SettingsSheet>
  )
}
