import { useState } from 'react'
import { BAR_MAX, BAR_MIN, BAR_STEP, FULL_BODY, GYM_ORDER, MUSCLE_GROUPS, workouts } from '../data/workout'
import { EQUIPMENT, EXERCISE_BANK, EXERCISE_BY_ID, coversOf, fitsPlan, isCore, primaryOf, ratingFor, ratingsOf } from '../data/exercises'
import { ALL_MUSCLES, MUSCLES, google, muscleName } from '../utils/muscles'
import { demoUrl, openDemo } from '../data/howto'
import { fmt, fmtSecs } from '../utils/format'
import { ConfirmSheet, SettingsSheet } from './ui/Sheet'
import { Segmented, StepperRow, ToggleRow } from './ui/controls'
import { InfoIcon } from './ui/glyphs'
import { ChoiceMenu } from './ui/ChoiceMenu'

// Settings › Exercises: every exercise in the bank, to look up and add to a
// plan. Search, or narrow by muscle group, what it targets and what it's
// done with. Tap one for its details, your numbers for it, and the plans
// it's in.

const PLANS = [...GYM_ORDER, ...FULL_BODY.map(p => p.id)]
const gearName = id => EQUIPMENT.find(e => e.id === id)?.label ?? id

// The plans an exercise is in this week, from each plan's two lists.
function plansWith(store, id) {
  return PLANS.filter(p => {
    const { main, core } = store.getExerciseSections(p)
    return [...main, ...core].some(x => x?.id === id)
  })
}

export function ExerciseBank({ store, onClose }) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('')
  const [target, setTarget] = useState('')
  const [gear, setGear] = useState('')
  const [open, setOpen] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [mine, setMine] = useState(false) // only ones you added
  const [planned, setPlanned] = useState(null) // null: all
  // One just added with +: on its page until it's saved (or cancelled,
  // which takes it away again).
  const [fresh, setFresh] = useState(null)
  function addNew() {
    const id = store.addCustomExercise()
    setFresh(id)
    setOpen(id)
  }
  const q = query.trim().toLowerCase()

  // No group picked: all of them.
  const inGroup = group ? EXERCISE_BANK.filter(x => x.group === group) : EXERCISE_BANK
  const targets = (group ? MUSCLES[group] : Object.values(MUSCLES).flat()).filter(m => inGroup.some(x => coversOf(x).includes(m)))
  const gears = EQUIPMENT.filter(e => inGroup.some(x => store.getEquipment(x) === e.id))
  const list = (q ? EXERCISE_BANK.filter(x => x.name.toLowerCase().includes(q)) : inGroup)
    .filter(x => q || !target || coversOf(x).includes(target))
    .filter(x => q || !gear || store.getEquipment(x) === gear)
    .filter(x => !mine || x.custom)
  const used = new Set(PLANS.flatMap(p => {
    const { main, core } = store.getExerciseSections(p)
    return [...main, ...core].map(x => x?.id)
  }))
  const inPlan = list.filter(x => used.has(x.id))
  const shown = planned === null ? list : planned ? inPlan : list.filter(x => !used.has(x.id))
  const groupLabel = MUSCLE_GROUPS.find(g => g.id === group)?.label ?? 'All'
  const filtered = !!(group || target || gear || mine || planned !== null)

  function pickGroup(id) {
    setGroup(id)
    setTarget('')
    setGear('')
  }

  return (
    <SettingsSheet title="Exercises" bare split full onClose={onClose}>
      <div className="flex items-center gap-2">
        <h2 className="flex-1 min-w-0 text-2xl font-bold text-stone-900 tracking-tight">Exercises</h2>
        <button onClick={addNew} aria-label="Add an exercise" className={`${HEAD_BTN} w-9 px-0 flex items-center justify-center`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        {/* Filters: a side bar from the right. */}
        <FilterButton on={filtered} onClick={() => setFiltersOpen(true)} />
        <button onClick={onClose} className={HEAD_BTN}>Done</button>
      </div>
      {filtersOpen && (
        <FilterDrawer onReset={filtered ? () => { setGroup(''); setTarget(''); setGear(''); setMine(false); setPlanned(null) } : null} onClose={() => setFiltersOpen(false)}>
          <Picker label="Muscle group" sheet value={group} onChange={pickGroup}
            options={[['', `All (${EXERCISE_BANK.length})`], ...MUSCLE_GROUPS.map(g => [g.id, `${g.label} (${EXERCISE_BANK.filter(x => x.group === g.id).length})`])]} shown={groupLabel} />
          <Picker label="Targets" sheet value={target} onChange={setTarget}
            options={[['', 'Any'], ...targets.map(m => [m, muscleName(m)])]} shown={target ? muscleName(target) : 'Any'} />
          <Picker label="Equipment" sheet value={gear} onChange={setGear}
            options={[['', 'Any'], ...gears.map(e => [e.id, e.label])]} shown={gear ? gearName(gear) : 'Any'} />
          <div className="rounded-xl border border-stone-200 px-3 flex items-center">
            <ToggleRow label="Added by me" on={mine} onChange={setMine} />
          </div>
          {/* In your plans or not: a picker like the others. */}
          <Picker label="Plans" sheet value={planned === null ? '' : planned ? 'in' : 'out'}
            onChange={v => setPlanned(v === '' ? null : v === 'in')}
            options={[['', `All (${list.length})`], ['in', `In a plan (${inPlan.length})`], ['out', `Not in a plan (${list.length - inPlan.length})`]]}
            shown={planned === null ? 'All' : planned ? 'In a plan' : 'Not in a plan'} />
        </FilterDrawer>
      )}
      <label className="flex items-center gap-2 rounded-xl bg-stone-100 px-3.5 py-2.5 text-stone-400">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`Search ${EXERCISE_BANK.length} exercises`}
          className="flex-1 min-w-0 bg-transparent text-base text-stone-900 placeholder:text-stone-400 outline-none select-text"
        />
      </label>
      <div data-scroll className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-5 px-5">
        {/* In your plans, or not: the switch in Filters. */}
        <div className="divide-y divide-stone-100">
          {shown.map(x => (
            <button key={x.id} onClick={() => setOpen(x.id)} className="w-full flex items-center gap-2.5 py-3 text-left active:bg-stone-50">
              <span className="flex-1 min-w-0 text-base text-stone-900">{x.name}</span>
              {x.custom && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-500 shrink-0" role="img" aria-label="Added by you"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>
              )}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-stone-300 shrink-0" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          ))}
        </div>
        {!shown.length && <p className="py-3 text-sm text-stone-400">{list.length ? (planned ? 'None of these are in a plan.' : 'All of these are in a plan.') : 'Nothing matches.'}</p>}
      </div>
      {open && EXERCISE_BY_ID[open] && (
        <ExercisePage store={store} exercise={EXERCISE_BY_ID[open]} fresh={fresh === open}
          onSaved={() => setFresh(null)} onClose={() => { setOpen(null); setFresh(null) }} />
      )}
    </SettingsSheet>
  )
}

// A dropdown: the phone's own picker over a box showing what's picked.
export function Picker({ label, value, options, shown, info, blank, blankText = 'Pick one', plain, sheet, locked, onChange, onOpen }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`relative min-w-0 rounded-xl border border-stone-200 bg-white pl-2.5 pr-2 py-1.5 flex items-center gap-1 ${locked ? 'pointer-events-none' : ''}`}>
      <button onClick={() => (onOpen ? onOpen() : setOpen(true))} disabled={locked} aria-label={label} aria-haspopup="listbox" className="absolute inset-0 w-full rounded-xl active:bg-stone-50" />
      <span className="relative flex-1 min-w-0 pointer-events-none">
        {plain ? <span className="block py-2 text-[15px] font-semibold text-stone-900">{label}</span> : (
          <>
            <span className="block text-[11px] font-semibold text-stone-400">{label}</span>
            <span className={`block truncate text-[15px] font-semibold ${blank ? 'text-stone-300' : 'text-stone-900'}`}>{blank ? blankText : shown}</span>
          </>
        )}
      </span>
      {info && <span className="relative z-10">{info}</span>}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" className="relative shrink-0 text-stone-400 pointer-events-none" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
      {open && !sheet && <ChoiceMenu title={label} value={blank ? null : value} options={options} onPick={onChange} onClose={() => setOpen(false)} />}
      {open && sheet && (
        <SettingsSheet title={label} closeLabel="Done" onClose={() => setOpen(false)}>
          <div className="rounded-xl bg-stone-50 overflow-hidden divide-y divide-stone-100" role="listbox" aria-label={label}>
            {options.map(([v, text]) => {
              const on = !blank && v === value
              return (
                <button key={v} role="option" aria-selected={on} onClick={() => { onChange(v); setOpen(false) }}
                  className="w-full flex items-center gap-2 px-3.5 py-3 text-left text-sm text-stone-800 active:bg-stone-100">
                  <span className={`flex-1 ${on ? 'font-semibold' : ''}`}>{text}</span>
                  <span className="w-4 text-center font-bold text-accent-500">{on ? '✓' : ''}</span>
                </button>
              )
            })}
          </div>
        </SettingsSheet>
      )}
    </div>
  )
}

const RATING = { 3: 'Best', 2: 'Good', 1: 'Okay' }

// One exercise: what it is, your numbers for it, and the plans it's in.
// Edit turns the numbers into controls (the same ones the plan uses, so a
// change shows everywhere it's done).
export function ExercisePage({ store, exercise: x, fresh, popup = false, onSaved = () => {}, onClose }) {
  // While editing, how it was before: Cancel puts it back, Save keeps the
  // changes (made as you go, so the controls show them).
  const [editing, setEditing] = useState(() => (fresh ? {} : null))
  const [deleting, setDeleting] = useState(false)
  // A new one starts with its details blank; each fills in once picked.
  const [blank, setBlank] = useState(() => (fresh ? ['group', 'equipment'] : []))
  const picked = f => setBlank(b => b.filter(x => x !== f))
  // A new one needs a name before it's saved; cancelling it takes it away.
  function cancel() {
    if (fresh) {
      store.deleteCustomExercise(x.id)
      onClose()
    } else {
      store.restoreExercise(x.id, editing)
      setEditing(null)
    }
  }
  function save() {
    if (!ready) return
    if (fresh) {
      store.saveCustomExercise(x.id)
      onSaved()
    }
    setEditing(null)
  }
  const gear = store.getEquipment(x)
  const n = store.getNumbers(x)
  const setup = store.getSetup(x)
  const hold = setup.mode === 'hold'
  const inPlans = plansWith(store, x.id)
  const fits = PLANS.filter(p => (isCore(x) ? true : fitsPlan(x, p)))
  const rating = Math.max(...(isCore(x) ? [ratingFor(x, 'core')] : fits.map(p => ratingFor(x, p))), 0) || 2
  const covers = coversOf(x)
  const group = MUSCLE_GROUPS.find(g => g.id === x.group)?.label
  const one = r => (hold ? fmtSecs(r) : String(r))
  const reps = n.reps.every(r => r === n.reps[0]) ? one(n.reps[0]) : n.reps.map(one).join(', ')
  const weightLabel = { barbell: 'Weight with bar', dumbbell: 'Weight (each)' }[gear] ?? 'Weight'
  const name = id => workouts[id]?.short ?? id
  const ratings = ratingsShown(x, rating)
  const taken = x.custom && nameTaken(x)
  const ready = !x.custom || (x.name.trim() && !taken && !blank.length && covers.length > 0 && covers.every(m => ratings[m]))

  const details = [
    ['Muscle group', group],
    ['Equipment', gearName(gear)],
    ...(gear === 'barbell' ? [['Bar', `${fmt(n.bar)} lb`]] : []),
  ]
  const numbers = [
    ['Sets', String(n.reps.length)],
    [hold ? 'Hold' : 'Reps', reps],
    [weightLabel, gear === 'bodyweight' && !n.weight ? 'None' : `${fmt(n.weight)} lb`],
    ['Per side', setup.perSide ? 'Yes' : 'No'],
    ['Rest', setup.restOn ? fmtSecs(setup.rest) : 'Off'],
  ]

  return (
    <SettingsSheet title={x.name} bare split full={!popup} onClose={onClose}>
      <div className="flex items-center gap-2">
        <h3 className="flex-1 min-w-0 truncate text-lg font-bold text-stone-900">{x.name || 'New exercise'}</h3>
        {editing ? (
          <>
            <button onClick={cancel} className={HEAD_BTN}>Cancel</button>
            <button onClick={save} disabled={!ready} className={`${HEAD_BTN} disabled:text-stone-300`}>Save</button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(store.exerciseSnapshot(x.id))} className={HEAD_BTN}>Edit</button>
            <button onClick={onClose} className={HEAD_BTN}>Back</button>
          </>
        )}
      </div>
      <div data-scroll className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-5 px-5 pb-2 space-y-6">
      {editing ? <DetailsEditor store={store} exercise={x} rating={rating} locked={inPlans.length > 0} blank={blank} picked={picked} /> : <Section title="Details">
        {details.map(([k, v]) => <Row key={k} label={k} value={v} />)}
        <a href={demoUrl(x.name, 'exercise')} target="_blank" rel="noopener noreferrer" onClick={e => { e.preventDefault(); openDemo(x.name, 'exercise') }} className="flex items-center justify-between py-2.5 active:opacity-60">
          <span className="text-[15px] text-stone-600">How to do it</span>
          <span className="flex items-center gap-1 text-[15px] font-semibold text-accent-500">YouTube<ArrowOut /></span>
        </a>
      </Section>}
      {!editing && coversOf(x).length > 0 && (
        <Section title="Targets">
          <div className="pb-1.5"><TargetsTable exercise={x} ratings={ratings} /></div>
        </Section>
      )}
      <Section title="Sets / Reps / Weight">
        {editing ? <NumbersEditor store={store} exercise={x} /> : numbers.map(([k, v]) => <Row key={k} label={k} value={v} />)}
      </Section>
      {x.custom && !fresh && (
        <button onClick={() => setDeleting(true)} className="w-full py-3 rounded-xl bg-red-50 text-red-600 text-[15px] font-semibold active:bg-red-100">
          Delete exercise
        </button>
      )}
      </div>

      {deleting && (
        <ConfirmSheet
          title={`Delete ${x.name}?`}
          body={(
            <>
              {[
                inPlans.length ? `It comes out of ${inPlans.map(name).join(', ')}, this week and every week.` : "It's not in any plan.",
                'Its sets, reps, weight and details are deleted.',
                'Build a Workout stops suggesting it.',
                "It's no longer in Trends. Past weeks keep what you logged.",
              ].map(t => <span key={t} className="block pl-3 -indent-3">• {t}</span>)}
            </>
          )}
          confirmLabel="Delete"
          onConfirm={() => { store.deleteCustomExercise(x.id); onClose() }}
          onClose={() => setDeleting(false)}
        />
      )}
    </SettingsSheet>
  )
}

// Details as the new-exercise form has them: muscle group, what it
// targets (primary or secondary), rating, and equipment and the bar. Core work stays core, and the rest can't
// become it (a plan keeps them in different sections).
function DetailsEditor({ store, exercise: x, rating, locked, blank = [], picked = () => {} }) {
  const [open, setOpen] = useState(false) // the Targets pop-up
  const gear = store.getEquipment(x)
  const n = store.getNumbers(x)
  const covers = coversOf(x)
  const core = isCore(x)
  // In a plan, core work stays core and the rest can't become it.
  const groups = locked ? MUSCLE_GROUPS.filter(g => (g.id === 'core') === core) : MUSCLE_GROUPS
  const primary = primaryOf(x)
  const edit = patch => store.setExerciseEdit(x.id, patch)
  // A new one's filled in in order: muscle group, targets, rating, equipment.
  const noGroup = blank.includes('group')
  const noTargets = noGroup || !covers.length
  const ratings = ratingsShown(x, rating)
  const noRating = noTargets || !covers.every(m => ratings[m])
  // Rating one makes the ones shown (a built-in's primaries start at its
  // rating) its own.
  const rate = (m, v) => edit({ ratings: { ...ratings, [m]: v } })
  const list = names => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0])
  // Targets are saved primaries first.
  function save(all, prim, ratings) {
    edit({ covers: [...prim, ...all.filter(m => !prim.includes(m))], primary: prim, ratings })
  }
  // At most three primary and three secondary.
  const MAX = 3
  const second = covers.filter(m => !primary.includes(m))
  // Tap Primary or Secondary to add a muscle as that (or switch it);
  // tap the one it is to take it off.
  // Its rating starts blank each time (it's for that role).
  function setRole(m, isPrimary) {
    const on = covers.includes(m)
    const blankRating = { ...ratings, [m]: 0 }
    if (on && primary.includes(m) === isPrimary) return save(covers.filter(c => c !== m), primary.filter(p => p !== m), blankRating)
    if (isPrimary ? primary.length >= MAX : second.length >= MAX) return
    save(on ? covers : [...covers, m], isPrimary ? [...primary.filter(p => p !== m), m] : primary.filter(p => p !== m), blankRating)
  }
  const targetsInfo = <InfoLink href={google(`${x.name} top 3 primary and top 3 secondary muscles worked (fewer if there aren't 3), from: ${ALL_MUSCLES.map(m => muscleName(m).toLowerCase()).join(', ')}`)} what={`What muscles ${x.name} targets`} />
  const ratingsInfo = <InfoLink href={google(`${x.name} how effective for each of ${list(covers.map(m => muscleName(m).toLowerCase()))}: best, good or okay?`)} what={`How good ${x.name} is for each`} />
  return (
    <div className="space-y-2">
      {x.custom && (
        <label className="block space-y-1.5 pb-3">
          <span className="block px-1 text-xs uppercase tracking-wider font-semibold text-stone-500">Name</span>
          <input
            value={x.name}
            onChange={e => store.renameCustomExercise(x.id, e.target.value)}
            placeholder="Exercise name"
            autoFocus={!x.name}
            className="w-full rounded-xl bg-stone-100 px-3.5 py-2.5 text-base text-stone-900 placeholder:text-stone-400 outline-none select-text"
          />
          {nameTaken(x) && <span className="block px-1 text-sm text-red-600">There's already an exercise called that.</span>}
        </label>
      )}
      <p className="px-1 text-xs uppercase tracking-wider font-semibold text-stone-500">Details</p>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
        <Picker label="Muscle group" sheet value={x.group} blank={blank.includes('group')} shown={MUSCLE_GROUPS.find(g => g.id === x.group)?.label}
          options={groups.map(g => [g.id, g.label])}
          info={<InfoLink href={google(`if you had to pick one: ${x.name} muscle group chest back shoulders arms legs or core`)} what={`What muscle group ${x.name} is`} />}
          onChange={g => { picked('group'); edit(!covers.length || covers.some(m => MUSCLES[g].includes(m)) ? { group: g } : { group: g, covers: [], primary: [] }) }} />
        <Picker label="Targets" blank={!covers.length} blankText="Pick one or more" shown="See table below" locked={noGroup}
          info={targetsInfo} onOpen={() => setOpen(true)} />
        {!noTargets && (
          <div className="min-w-0 rounded-xl border border-stone-200 bg-white pl-2.5 pr-2 py-1.5">
            <div className="flex items-center gap-1">
              <span className="flex-1 text-[11px] uppercase tracking-wider font-semibold text-stone-400">Ratings</span>
              {ratingsInfo}
              <span className="w-3 shrink-0" aria-hidden="true" />
            </div>
            <TargetsTable exercise={x} ratings={ratings} onRate={rate} />
          </div>
        )}
        {open && (
          <SettingsSheet title="Targets" closeLabel="Done" onClose={() => setOpen(false)}>
            <div className="rounded-xl bg-stone-50 pb-1">
              {MUSCLE_GROUPS.map(g => (
                <div key={g.id}>
                  <p className="px-2.5 pt-2.5 pb-0.5 text-[11px] uppercase tracking-wider font-semibold text-stone-400">{g.label}</p>
                  {MUSCLES[g.id].map(m => {
                    const on = covers.includes(m)
                    const isPrimary = primary.includes(m)
                    return (
                      <div key={m} className="flex items-center gap-2.5 px-2.5 py-1.5">
                        <span className={`flex-1 min-w-0 truncate text-[15px] ${on ? 'font-semibold text-stone-900' : 'text-stone-600'}`}>{muscleName(m)}</span>
                        <div className="shrink-0 flex rounded-lg bg-stone-100 p-0.5" role="radiogroup" aria-label={`${muscleName(m)}: primary or secondary`}>
                          {[[true, 'Primary'], [false, 'Secondary']].map(([v, text]) => {
                            const picked = on && isPrimary === v
                            return (
                              <button key={text} role="radio" aria-checked={picked} onClick={() => setRole(m, v)}
                                disabled={!picked && (v ? primary.length >= MAX : second.length >= MAX)}
                                className={`px-2 py-1 rounded-md text-xs font-semibold ${picked ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 disabled:text-stone-300'}`}>
                                {text}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </SettingsSheet>
        )}
        <Picker label="Equipment" sheet value={gear} shown={gearName(gear)} blank={blank.includes('equipment')} locked={noRating}
          options={EQUIPMENT.map(e => [e.id, e.label])}
          info={<InfoLink href={google(`if you had to pick one: most popular equipment for ${x.name}: ${EQUIPMENT.map(e => (e.id === 'bodyweight' ? e.id : e.label.toLowerCase())).join(', ')}`)} what={`What ${x.name} is usually done with`} />}
          onChange={v => { picked('equipment'); store.setEquipment(x, v) }} />
        {gear === 'barbell' && !blank.includes('equipment') && (
          <div className="rounded-xl bg-stone-50 px-3 py-2">
            <StepperRow label="Bar weight" value={n.bar} step={BAR_STEP} min={BAR_MIN} max={BAR_MAX} editable suffix=" lb" onChange={v => store.setBar(x, v)} />
          </div>
        )}
      </div>
    </div>
  )
}

export const HEAD_BTN = 'shrink-0 h-9 px-3 rounded-[10px] bg-stone-100 text-sm font-semibold text-stone-600 active:bg-stone-200'

// The numbers as controls: how it's counted, sets, reps or hold, weight,
// per side and rest.
function NumbersEditor({ store, exercise: x }) {
  const gear = store.getEquipment(x)
  const n = store.getNumbers(x)
  const setup = store.getSetup(x)
  const hold = setup.mode === 'hold'
  const weightLabel = { barbell: 'Weight with bar', dumbbell: 'Weight (each)' }[gear] ?? 'Weight'
  // Reps (or seconds) for every set at once.
  const setAll = v => n.reps.forEach((_, i) => store.setSetReps(x, i, v))
  function setSets(count) {
    if (count > n.reps.length) store.addSet(x)
    else if (count < n.reps.length) store.removeSet(x)
  }
  return (
    <div className="py-3 space-y-4">
      <Segmented label="Count in" value={setup.mode} options={[['reps', 'Reps'], ['hold', 'Time']]} onChange={mode => store.setSetup(x, { mode })} />
      <StepperRow label="Sets" value={n.reps.length} step={1} min={1} max={10} onChange={setSets} />
      <StepperRow label={hold ? 'Hold' : 'Reps'} value={n.reps[0]} step={hold ? 5 : 1} min={1} editable seconds={hold} onChange={setAll} />
      <StepperRow label={weightLabel} value={n.weight} step={5} min={gear === 'barbell' ? n.bar : 0} editable suffix=" lb" onChange={v => store.setWeight(x, v)} />
      <ToggleRow label="Per side" on={setup.perSide} onChange={perSide => store.setSetup(x, { perSide })} />
      <ToggleRow label="Rest between sets" on={setup.restOn} onChange={restOn => store.setSetup(x, { restOn })} />
      {setup.restOn && (
        <StepperRow label="Rest length" value={setup.rest} step={15} min={15} seconds onChange={rest => store.setSetup(x, { rest })} />
      )}
    </div>
  )
}

// Whether another exercise has its name (any case).
const nameTaken = x => {
  const name = x.name.trim().toLowerCase()
  return !!name && EXERCISE_BANK.some(e => e.id !== x.id && e.name.trim().toLowerCase() === name)
}

// How good it is for each muscle it targets: what you gave it, else (for a
// built-in) its rating for each primary; 0 where there's none yet.
function ratingsShown(x, rating) {
  const primary = primaryOf(x)
  const r = ratingsOf(x)
  return Object.fromEntries(coversOf(x).map(m => [m, m in r ? r[m] : (x.basePrimary ?? []).includes(m) && primary.includes(m) ? rating : 0]))
}

// How good it is for each muscle it targets, primaries then secondaries;
// with onRate, each rating's a Best / Good / Okay switch.
function TargetsTable({ exercise: x, ratings, onRate, title }) {
  const primary = primaryOf(x)
  const covers = coversOf(x)
  const groups = [['Primary', covers.filter(m => primary.includes(m))], ['Secondary', covers.filter(m => !primary.includes(m))]]
  return (
    <div className="text-[15px]">
      {title && <p className="text-[11px] uppercase tracking-wider font-semibold text-stone-400">{title}</p>}
      {groups.filter(([, list]) => list.length).map(([label, list]) => (
        <div key={label}>
          <p className="pt-2 pb-0.5 text-[11px] font-semibold text-stone-400">{label}</p>
          {list.map(m => (
            <div key={m} className="flex items-center gap-2 py-1.5">
              <span className="flex-1 min-w-0 truncate text-stone-900">{muscleName(m)}</span>
              {onRate ? (
                <div className="shrink-0 flex rounded-lg bg-stone-100 p-0.5" role="radiogroup" aria-label={`${muscleName(m)} rating`}>
                  {[[3, 'Best'], [2, 'Good'], [1, 'Okay']].map(([v, t]) => (
                    <button key={v} role="radio" aria-checked={ratings[m] === v} onClick={() => onRate(m, v)}
                      className={`px-2 py-1 rounded-md text-xs font-semibold ${ratings[m] === v ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              ) : (
                <span className={`shrink-0 font-semibold ${ratings[m] ? 'text-stone-900' : 'text-stone-300'}`}>{RATING[ratings[m]] ?? '—'}</span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function Section({ title, children }) {
  return (
    <div className="space-y-1.5">
      <p className="px-1 text-xs uppercase tracking-wider font-semibold text-stone-500">{title}</p>
      <div className="rounded-2xl bg-stone-50 px-4 divide-y divide-stone-200/70">{children}</div>
    </div>
  )
}

export function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-[15px] text-stone-600">{label}</span>
      <span className="min-w-0 text-right text-[15px] font-semibold text-stone-900">{value}</span>
    </div>
  )
}

// The app's ⓘ: grey, at the right, opening a search.
export function InfoLink({ href, what }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={what} onClick={e => e.stopPropagation()}
      className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-stone-400 active:bg-stone-100">
      <InfoIcon />
    </a>
  )
}

export function ArrowOut() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" /></svg>
  )
}

// The filter button in a bank's header, with a dot while any filter is on.
export function FilterButton({ on, onClick }) {
  return (
    <button onClick={onClick} aria-label="Filters" className={`${HEAD_BTN} relative w-9 px-0 flex items-center justify-center`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
      {on && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent-500" />}
    </button>
  )
}

// A bank's filters, in a side bar from the right; every filter the same height.
// Reset (once any is on) puts them all back.
export function FilterDrawer({ onReset, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 animate-[fade-in_200ms_ease-out]" />
      <aside
        role="dialog"
        aria-label="Filters"
        onClick={e => e.stopPropagation()}
        className="absolute inset-y-0 right-0 w-[85%] max-w-sm bg-white shadow-xl px-5 flex flex-col animate-[drawer-in_240ms_ease-out]"
        style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center gap-2">
          <h2 className="flex-1 min-w-0 text-2xl font-bold text-stone-900 tracking-tight">Filters</h2>
          {onReset && <button onClick={onReset} className={HEAD_BTN}>Reset</button>}
          <button onClick={onClose} className={HEAD_BTN}>Done</button>
        </div>
        <div className="mt-4 space-y-2 [&>div]:h-14">{children}</div>
      </aside>
    </div>
  )
}
