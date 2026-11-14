import { Fragment, useState } from 'react'
import { STRETCH_ROUTINE, GYM_ORDER, TARGETED, workouts } from '../../data/workout'
import { EXERCISE_BANK, EXERCISE_BY_ID, fitsPlan, isCore, ratingFor, ratingOn, coverage, coversOf, primaryOf } from '../../data/exercises'
import { openDemo } from '../../data/howto'
import { stretchAreas } from '../../utils/stretchCoverage'
import { STRETCH_BANK, STRETCH_BY_ID, stretchRating } from '../../data/stretches'
import { MUSCLE_LABEL, fitsEquipment } from '../../data/targeted'
import { InfoIcon } from '../ui/glyphs'
import { MUSCLES } from '../../utils/muscles'
import { InfoSheet } from '../ui/InfoMark'
import { SettingsSheet } from '../ui/Sheet'

// Like Add an exercise, by targeted muscle (the one each stretches most),
// starting with the muscles this workout mainly works. When one of those has no stretch of its own,
// "Fill a gap" lists what reaches it.
export function StretchPicker({ listId, store, onPick, onClose }) {
  const current = store.getStretches(listId)
  // What the main exercises work (Core has its own section, not stretches).
  const exercises = workouts[listId]?.exercises ? store.getExerciseSections(listId).main : []
  const trained = new Set(exercises.flatMap(x => (x ? primaryOf(x) : [])))
  // The same pairing as the coverage pill (see stretchAreas).
  const areas = stretchAreas(store, listId, current)
  const ids = areas.map(a => a.id)
  const missing = areas.filter(a => !a.covered)
  // One already in goes under the muscle it covers (by muscle only).
  const covering = Object.fromEntries(areas.filter(a => a.by && MUSCLE_LABEL[a.id]).map(a => [a.by.id, a.id]))
  // For a muscle, its rank as a rating: rank 1 is 3 (Recommended), rank 2
  // is 2 (Also stretches), rank 3 is 1 (Less directly).
  const on = (x, m) => { const i = x.muscles.indexOf(m); return i < 0 ? 0 : 3 - i }
  const fills = x => Math.max(0, ...missing.map(a => a.rate(x)))
  const forArea = (a, list) => list.filter(x => a.rate(x) > 0).sort((x, y) => a.rate(y) - a.rate(x))
  const gap = missing.length ? { names: missing.map(a => a.label).join(' and '), areas: missing, forArea, fills } : null
  // Which of your other gym plans has it already, as for exercises.
  const others = GYM_ORDER.includes(listId)
    ? GYM_ORDER.filter(p => p !== listId).map(p => [workouts[p].short, new Set(store.getStretches(p).map(x => x.id))])
    : []
  const elsewhere = x => others.filter(([, ids]) => ids.has(x.id)).map(([name]) => name)
  // Taken out for just this week (or this time): listed with what's in it.
  const off = listId === TARGETED.id || store.past ? [] : (store.weekDiff(listId)?.stretches?.dropped ?? [])
    .map(id => STRETCH_BY_ID[id]).filter(Boolean)
  return (
    <BankPicker
      gap={gap}
      off={off}
      elsewhere={elsewhere}
      title="Add a stretch"
      noun="stretches"
      kind="stretch"
      sections={MUSCLE_SECTIONS}
      sectionName="Targeted muscle"
      menuGroups={STRETCH_MENU}
      sectionOf={x => covering[x.id] ?? x.muscles[0] ?? 'other'}
      alsoIn={(x, m) => x.muscles.includes(m)}
      bank={STRETCH_BANK}
      rate={(x, muscle) => (muscle && muscle !== 'other' ? on(x, muscle) : stretchRating(x, listId, trained))}
      exclude={current.map(x => x.id)}
      current={current}
      currentLabel={listId === STRETCH_ROUTINE.id ? 'In the routine' : 'In these stretches'}
      countLabel="in stretches"
      first={ids.filter(id => MUSCLE_LABEL[id])}
      onPick={onPick}
      onClose={onClose}
    />
  )
}

const MUSCLE_ORDER = Object.keys(MUSCLE_LABEL)
// Exercises by muscle, with Other for the few that mainly work none of them.
// The muscle menu's groups (Other on its own at the end).
const MUSCLE_MENU = [...Object.entries(MUSCLES).map(([g, ids]) => [g[0].toUpperCase() + g.slice(1), ids]), ['Other', ['other']]]
// For stretches, the same muscles under the stretch areas.
const STRETCH_MENU = [
  ['Neck', ['traps']],
  ['Chest & shoulders', ['chest', 'front-delts', 'side-delts', 'rear-delts']],
  ['Arms & wrists', ['biceps', 'triceps']],
  ['Back', ['lats', 'lower-back']],
  ['Sides & core', ['abs', 'obliques']],
  ['Hips & glutes', ['glutes', 'inner-thighs', 'outer-thighs']],
  ['Hamstrings & quads', ['hamstrings', 'quads']],
  ['Calves & feet', ['calves']],
  ['Other', ['other']],
]
const MUSCLE_SECTIONS = [...MUSCLE_ORDER.map(id => ({ id, label: MUSCLE_LABEL[id] })), { id: 'other', label: 'Other' }]

// The same for exercises, by the muscle each mainly works (what the plans
// are built from). One already in the list goes under the area it covers.
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
  const elsewhere = x => others.filter(([, ids]) => ids.has(x.id)).map(([name]) => name)
  // A gym plan can take anything, so each muscle offers its best.
  const bank = EXERCISE_BANK.filter(x => (core ? isCore(x) : GYM_ORDER.includes(workoutId) || fitsPlan(x, workoutId)) && (workoutId !== 'targeted' || fitsEquipment(x, store.targeted.eq)))
  // How well it fills what's missing: its best rating for a missing area it
  // mainly works (0: it doesn't).
  const fills = x => Math.max(0, ...missing.map(a => a.rate(x)))
  // Each missing area with what mainly works it, best for it first.
  const forArea = (a, list) => list.filter(x => a.rate(x) > 0).sort((x, y) => a.rate(y) - a.rate(x))
  const gap = missing.length ? { names, fills, areas: missing, forArea } : null
  const areas = coverage(list, area)
  // One in it goes under the muscle it covers (a group isn't a section).
  const covering = Object.fromEntries(areas.filter(a => a.by && MUSCLE_LABEL[a.id]).map(a => [a.by.id, a.id]))
  // Taken out for just this week (or this time): still part of it, so
  // listed with what's in it rather than offered again.
  const off = workoutId === TARGETED.id || store.past ? [] : store.weekDiff(workoutId).exercises.dropped
    .map(id => EXERCISE_BY_ID[id]).filter(x => x && (isCore(x) && !sections.coreInMain) === core)

  return (
    <BankPicker
      gap={gap}
      off={off}
      elsewhere={elsewhere}
      title={core ? 'Add a core exercise' : 'Add an exercise'}
      noun="exercises"
      kind="exercise"
      sections={MUSCLE_SECTIONS}
      sectionName="Muscle"
      menuGroups={MUSCLE_MENU}
      sectionOf={x => covering[x.id] ?? primaryOf(x)[0] ?? coversOf(x)[0] ?? 'other'}
      bank={bank}
      rate={(x, muscle) => (muscle && muscle !== 'other' ? ratingOn(x, muscle) : ratingFor(x, core ? 'core' : workoutId))}
      exclude={store.getExercises(workoutId).map(x => x.id)}
      current={list}
      currentLabel="In this workout"
      countLabel={core ? 'in core' : 'in workout'}
      first={areas.map(a => a.id)}
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

function BankPicker({ title, noun, kind, sections, sectionName = 'Area', menuGroups, sectionOf, alsoIn = () => false, bank, exclude, current, currentLabel, countLabel = 'added', first, rate, gap, off = [], elsewhere = () => [], onPick, onClose }) {
  const [query, setQuery] = useState('')
  const [more, setMore] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [tabMenu, setTabMenu] = useState(false)
  const [planInfo, setPlanInfo] = useState(null) // the one whose plans show
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
    .filter(sec => left.some(x => sectionOf(x) === sec.id || alsoIn(x, sec.id)) || current.some(x => sectionOf(x) === sec.id))
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
        {group && <span className="font-medium text-stone-400">{group}: </span>}
        <span className={struck ? 'text-stone-400 line-through' : have ? 'font-semibold' : ''}>{x.name}</span>
        {note && <span className="block text-xs text-stone-400 mt-0.5">{note}</span>}
      </span>
    )
    return (
      <div key={x.id}>
        <div className="flex items-center">
          {have ? (
            <div className="flex-1 min-w-0 flex items-center justify-between gap-2 pl-3.5 pr-1 py-2.5 text-sm text-stone-800">
              {name}
              <span className="text-stone-400 font-bold" aria-label={`${x.name} is added`}>✓</span>
            </div>
          ) : (
            <button onClick={() => onPick(x.id)} className="flex-1 min-w-0 flex items-center pl-3.5 pr-1 py-2.5 text-left text-sm text-stone-800 active:bg-stone-100">
              {name}
            </button>
          )}
          {!have && !struck && elsewhere(x).length > 0 && (
            <button
              onClick={() => setPlanInfo(x)}
              aria-label={`${x.name} is in another plan`}
              className="w-9 h-10 rounded-lg flex items-center justify-center shrink-0 text-stone-400 active:bg-stone-100"
            >
              <PlansIcon />
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
            const rows = hits.filter(x => rate(x, sectionOf(x)) === r)
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
    // Its own, plus any that also reach it (`alsoIn`), rated lower.
    const inTab = left.filter(x => sectionOf(x) === sec.id || alsoIn(x, sec.id))
    // Ones already in another of your plans stay in their tier, after the
    // rest and marked with the plan, so you don't do one twice a week.
    const byPlan = (x, y) => Number(elsewhere(x).length > 0) - Number(elsewhere(y).length > 0)
    const tiers = TIERS.map(([r, label]) => [r, label(group, kind), inTab.filter(x => rate(x, sec.id) === r).sort(byPlan)])
    // Recommended shows its first three (not in another plan, when there
    // are any); the rest wait for "Show more".
    const FIRST = 3
    const fresh = tiers[0][2].filter(x => !elsewhere(x).length)
    const top = (fresh.length ? fresh : tiers[0][2]).slice(0, FIRST)
    const extra = inTab.length - top.length
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
        {!fillers.length && <p className="text-sm text-stone-400">Nothing in {group} fills {gap.names.toLowerCase()}. Try another {sectionName.toLowerCase()}.</p>}
      </div>
    ) : (
      <div className={box}>
        {tiers.map(([r, label, rows]) => {
          const shown = more ? rows : r === 3 ? top : []
          return shown.length > 0 && (
            <Fragment key={r}>
              {heading(label, r === 3)}
              {shown.map(x => row(x))}
            </Fragment>
          )
        })}
        {top.length === 0 && !more && (
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
      {/* What's in it and which muscle (or area) to pick from, as one card
          of rows like the weight settings. */}
      {!q && (current.length + off.length > 0 || tabs.length > 1) && (
        <div className="rounded-2xl bg-stone-50 divide-y divide-stone-200/70 overflow-hidden">
          {current.length + off.length > 0 && (
            <button onClick={() => setShowCurrent(true)} className="w-full flex items-center gap-2 px-4 py-3 text-left active:bg-stone-100">
              <span className="flex-1 text-base text-stone-600">{currentLabel}</span>
              {off.length > 0 && <span className="text-base text-stone-400">{off.length} off</span>}
              {chevron}
            </button>
          )}
          {tabs.length > 1 && (
            <button onClick={() => setTabMenu(true)} aria-haspopup="listbox" className="w-full flex items-center gap-2 px-4 py-3 text-left active:bg-stone-100">
              <span className="flex-1 text-base text-stone-600">{sectionName}</span>
              <span className="min-w-0 truncate text-base font-semibold text-stone-900">{sec?.label}</span>
              {chevron}
            </button>
          )}
        </div>
      )}
      {showCurrent && (
        <SettingsSheet title={currentLabel} closeLabel="Done" onClose={() => setShowCurrent(false)}>
          {/* By group when there are groups (in the plan's order), else one list. */}
          {(menuGroups
            ? menuGroups.map(([label, ids]) => [label, sections.filter(sc => ids.includes(sc.id))])
            : [[null, sections]]
          ).map(([label, secs]) => [label, secs.flatMap(sc => [
            ...current.filter(x => sectionOf(x) === sc.id).map(x => row(x, true, null, sc.label)),
            ...off.filter(x => sectionOf(x) === sc.id).map(x => row(x, false, null, sc.label, true)),
          ]), secs])
            .filter(([, rows]) => rows.length)
            .sort(([, , a], [, , b]) => sections.indexOf(a.find(sc => [...current, ...off].some(x => sectionOf(x) === sc.id))) - sections.indexOf(b.find(sc => [...current, ...off].some(x => sectionOf(x) === sc.id))))
            .map(([label, rows]) => (
              <div key={label ?? 'all'} className={`${box} mb-3`}>
                {label && heading(label)}
                {rows}
              </div>
            ))}
        </SettingsSheet>
      )}
      {tabMenu && (
        <SettingsSheet title={sectionName} closeLabel="Done" onClose={() => setTabMenu(false)}>
          {/* By group (the plan's first) when there are groups, else one list. */}
          {(menuGroups
            ? menuGroups.map(([label, ids]) => [label, tabs.filter(t => ids.includes(t.id))]).filter(([, ts]) => ts.length)
              .sort(([, a], [, b]) => tabs.indexOf(a[0]) - tabs.indexOf(b[0]))
            : [[null, tabs]]
          ).map(([label, ts]) => (
            <div key={label ?? 'all'} className={box} role="listbox" aria-label={label ?? sectionName}>
              {label && heading(label)}
              {ts.map(t => {
                const n = current.filter(x => sectionOf(x) === t.id).length
                const on = t.id === sec?.id
                return (
                  <button key={t.id} role="option" aria-selected={on} onClick={() => { pickTab(t.id); setTabMenu(false) }}
                    className="w-full flex items-center gap-2 px-3.5 py-3 text-left text-sm text-stone-800 active:bg-stone-100">
                    <span className={`flex-1 ${on ? 'font-semibold' : ''}`}>{t.label}</span>
                    {n > 0 && <span className="text-stone-400">{n} {countLabel}</span>}
                    <span className="w-4 text-center font-bold text-accent-500">{on ? '✓' : ''}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </SettingsSheet>
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
      {planInfo && (
        <InfoSheet
          icon={<PlansIcon />}
          title="In another plan"
          text={`${planInfo.name} is already in ${listOf(elsewhere(planInfo))}.`}
          onClose={() => setPlanInfo(null)}
        />
      )}
    </SettingsSheet>
  )
}

const listOf = xs => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`)

// Two stacked cards: it's in another plan too.
function PlansIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
    </svg>
  )
}

const chevron = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" className="shrink-0 text-stone-400" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
)
