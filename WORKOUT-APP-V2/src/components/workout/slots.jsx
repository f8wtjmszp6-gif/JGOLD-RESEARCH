import { useState } from 'react'
import { MUSCLE_LABEL, TARGET_AREA_BY_ID, areaStretches, slotChoices, usesEquipment } from '../../data/targeted'
import { EXERCISE_BY_ID } from '../../data/exercises'
import { STRETCH_BANK, STRETCH_BY_ID } from '../../data/stretches'
import { openDemo } from '../../data/howto'
import { InfoIcon } from '../ui/glyphs'
import { SettingsSheet } from '../ui/Sheet'
import { SwipeRow } from '../ui/SwipeRow'

// A built workout's empty slots (see buildTargeted): one row each, where its
// exercise or stretch goes, named for what it's for. Tap to pick one; swipe
// it away if you don't want it.
const slotName = (kind, slot) => (kind === 'stretch'
  ? `${TARGET_AREA_BY_ID[slot.area].label} stretch`
  : `${MUSCLE_LABEL[slot.muscle] ?? TARGET_AREA_BY_ID[slot.area].label} exercise`)

// The slots of `kind` in `slots` (with their places among them) that pass
// `show`, each opening its picker.
export function SlotRows({ kind, slots, show = () => true, store }) {
  const [picking, setPicking] = useState(null) // the slot's place
  const slot = picking !== null ? slots[picking] : null
  return (
    <>
      {slots.map((x, i) => show(x) && (
        <SwipeRow key={`${kind}-${i}-${x.suggest}`} label={slotName(kind, x)} onRemove={() => store.dropTargetedSlot(kind, i)}>
          <button
            onClick={() => setPicking(i)}
            className="w-full flex items-center gap-3 rounded-2xl bg-white shadow-sm px-4 py-3 text-left active:bg-stone-50"
          >
            <span className="w-6 h-6 rounded-full border-2 border-dashed border-stone-300 shrink-0" />
            <span className="flex-1 min-w-0 font-semibold text-stone-400">{slotName(kind, x)}</span>
            <span className="text-sm font-semibold text-accent-500">Pick</span>
          </button>
        </SwipeRow>
      ))}
      {slot && (
        <SlotPicker
          kind={kind}
          slot={slot}
          store={store}
          onPick={id => { store.fillTargetedSlot(kind, picking, id); setPicking(null) }}
          onClose={() => setPicking(null)}
        />
      )}
    </>
  )
}

// What can go in a slot. For an exercise: Available exercises, every one
// that mainly works its muscle with what you have (the app's pick first; ten,
// then Show all), and a closed section of the others that fit your equipment
// — ones that mainly work its muscle, then ones that work it too, then its
// area's others. For a stretch: the app's pick, then its area's. Search
// finds any.
const FIRST_SHOWN = 10
function SlotPicker({ kind, slot, store, onPick, onClose }) {
  const [query, setQuery] = useState('')
  const [all, setAll] = useState(false)
  const [more, setMore] = useState(false)
  const q = query.trim().toLowerCase()
  const t = store.targeted
  const have = kind === 'stretch' ? t.stretches : [...t.main, ...t.core]
  const area = TARGET_AREA_BY_ID[slot.area]
  let groups
  let top = []
  if (kind === 'stretch') {
    const pool = (q ? STRETCH_BANK.map(x => x.id) : areaStretches(area)).filter(id => STRETCH_BY_ID[id] && !have.includes(id))
    groups = [[q ? 'Matches' : `For ${area.label.toLowerCase()}`, pool.map(id => STRETCH_BY_ID[id])]]
  } else {
    const choices = slotChoices(slot, t.eq, have)
    top = choices.filter(c => c.tier === 0 && usesEquipment(c.ex, t.eq)).map(c => c.ex)
    const muscle = (MUSCLE_LABEL[slot.muscle] ?? area.label).toLowerCase()
    groups = q
      ? [['Matches', choices.map(c => c.ex)]]
      : [[`Works ${muscle}`, 0], [`Also works ${muscle}`, 1], [`More for ${area.label.toLowerCase()}`, 2]]
        .map(([label, tier]) => [label, choices.filter(c => c.tier === tier).map(c => c.ex)])
  }
  const first = slot.suggest && !have.includes(slot.suggest)
    ? (kind === 'stretch' ? STRETCH_BY_ID : EXERCISE_BY_ID)[slot.suggest]
    : null
  const suggest = q ? [] : kind === 'stretch' ? [first].filter(Boolean)
    : top.includes(first) ? [first, ...top.filter(x => x !== first)] : top
  // Exercises keep the rest in their own closed section, unless nothing's
  // available.
  const folded = kind !== 'stretch' && !q && suggest.length > 0
  const shown = groups
    .map(([label, list]) => [label, list.filter(x => !suggest.includes(x) && (!q || x.name.toLowerCase().includes(q)))])
    .filter(([, list]) => list.length)
  const others = shown.reduce((n, [, list]) => n + list.length, 0)

  const row = x => (
    <div key={x.id} className="flex items-center">
      <button onClick={() => onPick(x.id)} className="flex-1 min-w-0 pl-3.5 pr-1 py-2.5 text-left text-sm text-stone-800 active:bg-stone-100">
        {x.name}
      </button>
      <button
        onClick={() => openDemo(x.name, kind)}
        aria-label={`How to do ${x.name}`}
        className="w-10 h-10 mr-1 rounded-lg flex items-center justify-center shrink-0 text-stone-400 active:bg-stone-100"
      >
        <InfoIcon />
      </button>
    </div>
  )
  const heading = (text, green) => (
    <p className={`px-3.5 pt-3 pb-1 text-xs uppercase tracking-wider font-medium ${green ? 'text-emerald-700' : 'text-stone-400'}`}>{text}</p>
  )

  return (
    <SettingsSheet title={slotName(kind, slot)} closeLabel="Cancel" tall onClose={onClose}>
      <input
        id="slot-search"
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={kind === 'stretch' ? 'Search stretches' : 'Search exercises'}
        className="w-full rounded-xl bg-stone-100 px-3.5 py-2.5 text-base text-stone-900 placeholder:text-stone-400 outline-none select-text"
      />
      <div className="rounded-xl bg-stone-50 overflow-hidden divide-y divide-stone-100">
        {suggest.length > 0 && (
          <div className="divide-y divide-stone-100">
            {heading(kind === 'stretch' ? 'Suggested' : 'Available exercises', true)}
            {(all ? suggest : suggest.slice(0, FIRST_SHOWN)).map(row)}
            {suggest.length > FIRST_SHOWN && (
              <button onClick={() => setAll(!all)} className="w-full px-3.5 py-3 text-left text-sm font-semibold text-accent-500 active:bg-stone-100">
                {all ? 'Show fewer' : `Show all ${suggest.length}`}
              </button>
            )}
          </div>
        )}
        {!folded && shown.map(([label, list]) => (
          <div key={label} className="divide-y divide-stone-100">
            {heading(label)}
            {list.map(row)}
          </div>
        ))}
        {!suggest.length && !shown.length && <p className="px-3.5 py-2.5 text-sm text-stone-400">Nothing {q ? `matches “${query}”` : 'left to pick'}.</p>}
      </div>
      {folded && others > 0 && (
        <div className="rounded-xl bg-stone-50 overflow-hidden divide-y divide-stone-100">
          <button onClick={() => setMore(!more)} aria-expanded={more} className="w-full px-3.5 py-3 flex items-center gap-2 text-left active:bg-stone-100">
            <span className="flex-1 min-w-0 text-sm font-semibold text-stone-700">Other exercises</span>
            <span className="text-sm text-stone-400">{others}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`text-stone-400 shrink-0 transition-transform ${more ? 'rotate-180' : ''}`} aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {more && shown.map(([label, list]) => (
            <div key={label} className="divide-y divide-stone-100">
              {heading(label)}
              {list.map(row)}
            </div>
          ))}
        </div>
      )}
    </SettingsSheet>
  )
}
