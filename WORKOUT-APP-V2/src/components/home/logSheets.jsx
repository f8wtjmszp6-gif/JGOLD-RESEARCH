import { useState } from 'react'
import { CLASS_AREAS, CLASS_DEFAULT, SPORTS, CARDIO_TYPES, CARDIO_WORKOUT_MINUTES, cardioIsWorkout, CLASS_STRETCH_WORKOUT_MINUTES, classIsWorkout, STRETCH_WORKOUT_MINUTES } from '../../data/workout'
import { SettingsSheet } from '../ui/Sheet'
import { StepperRow, Segmented, ToggleRow } from '../ui/controls'
import { TypeIcon } from '../ui/Icons'
import { EffortInfo } from '../ui/EffortInfo'
import { weekdayOf } from '../../utils/days'
import { DayPicker } from '../ui/DayPicker'
import { LogButton } from '../ui/LogButton'

const EFFORT = [['easy', 'Easy'], ['hard', 'Hard']]

// "Effort" with its ⓘ (see EffortInfo).
function EffortLabel({ kind }) {
  return <span className="flex items-center gap-1">Effort<EffortInfo kind={kind} /></span>
}

// What this session adds to the cardio goal (a hard minute counts as two),
// as subtext: under a sheet's title, or a row's.
function CountsAs({ minutes, hard }) {
  return <span className="text-stone-400">{minutes} min {hard ? 'hard' : 'easy'} counts as <span className="font-semibold text-stone-500">{minutes * (hard ? 2 : 1)} cardio min</span></span>
}

// What you did in a class: cardio (how long, how hard), strength (which
// areas) and stretching. Everything starts off; cardio remembers your last
// length and effort.
// With `edit`, it opens filled in with that class to change or delete.
export function LogClassSheet({ store, edit, onClose }) {
  const [c, setC] = useState(() => (edit ? { ...CLASS_DEFAULT, ...edit.entry } : { ...store.getNewClass(), at: store.today.toISOString() }))
  const set = patch => setC(cur => ({ ...cur, ...patch }))
  const all = CLASS_AREAS.map(a => a.id)
  const full = all.every(id => c.areas.includes(id))

  // Full body stands on its own (it's all three): picking an area after it
  // starts over with just that one, and picking all three is Full body.
  function toggleArea(id) {
    set({ areas: full ? [id] : c.areas.includes(id) ? c.areas.filter(x => x !== id) : [...c.areas, id] })
  }

  const strengthOn = c.strength && c.areas.length > 0
  const workout = classIsWorkout(c)
  const nothing = !c.cardio && !strengthOn && !c.stretch
  // Stretching alone: how many more minutes until it counts as a workout.
  const need = c.stretch && !c.cardio && !strengthOn ? CLASS_STRETCH_WORKOUT_MINUTES - c.stretchMinutes : 0
  const cardioNeed = CARDIO_WORKOUT_MINUTES[c.hard ? 'hard' : 'easy'] - c.minutes

  // Strength with no areas picked would light nothing up, so it doesn't count.
  function log() {
    const answers = { ...c, strength: c.strength && c.areas.length > 0, areas: c.strength ? c.areas : [] }
    if (edit) store.editClass(edit.index, answers)
    else store.logClass(answers)
    onClose()
  }

  const chip = on => `flex-auto px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${on ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`

  return (
    <SettingsSheet title={edit ? editTitle(edit.entry.at, 'Class') : 'Log a class'} closeLabel="Cancel" tall onClose={onClose}>
      <div className="space-y-4">
        <ToggleRow label="Cardio" detail={c.cardio && <CountsAs minutes={c.minutes} hard={c.hard} />} on={c.cardio} onChange={v => set({ cardio: v })} />
        {c.cardio && (
          <>
            <StepperRow label="Length" value={c.minutes} step={5} min={5} max={240} editable suffix=" min" onChange={v => set({ minutes: v })} />
            <Segmented label={<EffortLabel kind="class" />} value={c.hard ? 'hard' : 'easy'} options={EFFORT} onChange={v => set({ hard: v === 'hard' })} />
            {/* Only matters when cardio is all you did: then it needs as long
                as any cardio session to count. */}
            {strengthOn || c.stretch ? null : workout ? (
              <p className="text-sm font-semibold text-emerald-700">✓ Counts as a workout</p>
            ) : (
              <p className="text-sm text-stone-500">
                {cardioNeed} more {cardioNeed === 1 ? 'minute' : 'minutes'} to count as a workout
                <span className="text-stone-400"> ({CARDIO_WORKOUT_MINUTES.hard} hard or {CARDIO_WORKOUT_MINUTES.easy} easy)</span>
              </p>
            )}
          </>
        )}
      </div>
      <div className="space-y-4 pt-5 border-t border-stone-100">
        <ToggleRow
          label="Strength"
          on={c.strength}
          onChange={v => set({ strength: v })}
        />
        {c.strength && (
          // A full-width switch like Build a Workout's equipment, but you can
          // pick more than one area, or Full body on its own.
          <div className="bg-stone-100 rounded-xl p-1 flex">
            {CLASS_AREAS.map(a => (
              <button key={a.id} onClick={() => toggleArea(a.id)} aria-pressed={!full && c.areas.includes(a.id)} className={chip(!full && c.areas.includes(a.id))}>{a.label}</button>
            ))}
            <button onClick={() => set({ areas: full ? [] : all })} aria-pressed={full} className={chip(full)}>Full body</button>
          </div>
        )}
      </div>
      <div className="space-y-4 pt-5 border-t border-stone-100">
        <ToggleRow
          label="Stretching"
          detail="Counts as a stretch day"
          on={c.stretch}
          onChange={v => set({ stretch: v })}
        />
        {c.stretch && (
          <StepperRow label="Length" value={c.stretchMinutes} step={5} min={5} max={240} editable suffix=" min" onChange={v => set({ stretchMinutes: v })} />
        )}
        {/* Only matters when stretching is all you did. */}
        {c.stretch && !c.cardio && !strengthOn && (need > 0 ? (
          <p className="text-sm text-stone-500">
            {need} more {need === 1 ? 'minute' : 'minutes'} to count as a workout
            <span className="text-stone-400"> (stretching alone needs {CLASS_STRETCH_WORKOUT_MINUTES})</span>
          </p>
        ) : (
          <p className="text-sm font-semibold text-emerald-700">✓ Counts as a workout</p>
        ))}
      </div>
      {!edit && <DayPicker now={store.today} dayLog={store.dayLog} at={c.at} onChange={at => set({ at })} />}
      <LogButton disabled={nothing} onSave={log}>
        {nothing ? 'Turn on what you did' : edit ? 'Save' : 'Log class'}
      </LogButton>
    </SettingsSheet>
  )
}

// Logs a walk (kind "walk"), other cardio ("other") or a sport or hike
// ("sport"). Starts from the last one you added. Other cardio and sports say
// what they were, and can count as a workout, so they show how close they are.
export function AddCardioSheet({ kind = 'other', store, edit, onClose }) {
  const isWalk = kind === 'walk'
  const isSport = kind === 'sport'
  const start = edit?.entry ?? store.getCardioSetting(kind)
  const [minutes, setMinutes] = useState(start.minutes)
  const [hard, setHard] = useState(start.hard)
  const [at, setAt] = useState(edit?.entry.at ?? store.today.toISOString())
  // What it was. Sports: a tile, or one from Other sports (saved, or a new one
  // kept to this once: `keep` false).
  const choices = isSport ? store.sportNames : CARDIO_TYPES
  const oneOff = isSport && !!edit && !!start.type && !choices.includes(start.type)
  // A new sport starts on your last one only if it's a tile; one of your
  // own isn't picked for you, so Other sports starts closed and unpicked.
  const [type, setType] = useState(() => {
    if (isWalk) return null
    if (edit) return start.type ?? null
    if (isSport) return SPORTS.includes(start.type) ? start.type : null
    return choices.includes(start.type) ? start.type : choices[0]
  })
  const [keep, setKeep] = useState(!oneOff)
  // Sports: a tile for each common one, and Other sports for the ones you've
  // added (or a new one).
  const [listOpen, setListOpen] = useState(false)
  const tiles = isSport ? SPORTS : choices
  const picked = type
  const offTiles = isSport && type && !SPORTS.includes(type)

  const workout = !isWalk && cardioIsWorkout({ minutes, hard })
  const need = CARDIO_WORKOUT_MINUTES[hard ? 'hard' : 'easy'] - minutes

  function add() {
    const what = picked || undefined
    if (edit) store.editCardio(kind, edit.index, { minutes, hard, at, ...(what && { type: what }) }, keep)
    else if (isWalk) store.addWalk(minutes, hard, at)
    else if (isSport) store.addSport(minutes, hard, at, what, keep)
    else store.addOtherCardio(minutes, hard, at, what)
    onClose()
  }

  const title = edit
    ? editTitle(edit.entry.at, isWalk ? 'Walk' : edit.entry.type && edit.entry.type !== 'Other' ? edit.entry.type : isSport ? 'Sport' : 'Cardio')
    : isWalk ? 'Add a walk' : isSport ? 'Add a sport or hike' : 'Add cardio'
  // A tile per choice: its icon and name, the picked one outlined in the card's color.
  const tile = on => `flex flex-col items-center gap-1 rounded-xl px-1 pt-2.5 pb-2 border-[1.5px] text-[11.5px] font-semibold transition-colors min-w-0 ${
    on ? (isSport ? 'bg-lime-50 text-lime-800 border-lime-600' : 'bg-cyan-50 text-cyan-700 border-cyan-600') : 'bg-stone-100 text-stone-500 border-transparent active:bg-stone-200'
  }`
  return (
    <SettingsSheet title={title} subtitle={<CountsAs minutes={minutes} hard={hard} />} closeLabel="Cancel" onClose={onClose}>
      {!isWalk && (
        <div className="space-y-2">
          <span className="text-base text-stone-600">What did you do?</span>
          {/* Cardio: three to a row, then Other across the bottom. */}
          <div className={`grid gap-1.5 ${isSport ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {tiles.filter(c => isSport || c !== 'Other').map(c => (
              <button key={c} onClick={() => { setType(c); setKeep(true) }} aria-pressed={type === c} className={tile(type === c)}>
                <TypeIcon name={c} />
                <span className="w-full truncate text-center">{c}</span>
              </button>
            ))}
          </div>
          {!isSport && tiles.includes('Other') && (
            <button onClick={() => { setType('Other'); setKeep(true) }} aria-pressed={type === 'Other'} className={`${tile(type === 'Other')} w-full !flex-row justify-center gap-2 !text-sm py-2.5`}>
              <TypeIcon name="Other" />
              Other
            </button>
          )}
          {/* Sports: ones you've added, or a new one. */}
          {isSport && (
            <button
              onClick={() => setListOpen(true)}
              className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 border-[1.5px] text-sm font-semibold transition-colors ${
                offTiles ? 'bg-lime-50 text-lime-800 border-lime-600' : 'bg-stone-100 text-stone-600 border-transparent active:bg-stone-200'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                {offTiles && <TypeIcon name={keep ? type : 'Other'} />}
                <span className="truncate">{offTiles ? type : 'Other sports'}</span>
                {offTiles && !keep && <span className="text-xs font-medium text-lime-700/70 shrink-0">just this once</span>}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
            </button>
          )}
        </div>
      )}
      {listOpen && (
        <SportList
          store={store}
          picked={type}
          onPick={(c, save = true) => { setType(c); setKeep(save); setListOpen(false) }}
          onForget={c => { store.forgetSport(c); if (type === c) setType(null) }}
          onClose={() => setListOpen(false)}
        />
      )}
      <StepperRow label="Length" value={minutes} step={5} min={5} max={480} editable suffix=" min" onChange={setMinutes} />
      <Segmented label={<EffortLabel kind={kind} />} value={hard ? 'hard' : 'easy'} options={EFFORT} onChange={v => setHard(v === 'hard')} />
      {/* 30 min hard or 45 easy makes it a workout, not just cardio minutes. */}
      {isWalk ? null : workout ? (
        <p className="text-sm font-semibold text-emerald-700">✓ Counts as a workout</p>
      ) : (
        <p className="text-sm text-stone-500">
          {need} more {need === 1 ? 'minute' : 'minutes'} to count as a workout
          <span className="text-stone-400"> ({CARDIO_WORKOUT_MINUTES.hard} hard or {CARDIO_WORKOUT_MINUTES.easy} easy)</span>
        </p>
      )}
      {!edit && <DayPicker now={store.today} dayLog={store.dayLog} at={at} onChange={setAt} />}
      <LogButton disabled={isSport && !picked} onSave={add}>
        {isSport && !picked ? 'Pick what you did' : picked && picked !== 'Other'
          // Whether it counts shows just above, so a named one keeps the button short.
          ? `${edit ? 'Save' : 'Add'} ${picked} · ${minutes} min`
          : `${edit ? 'Save' : 'Add'} ${minutes} min · ${workout ? 'counts as a workout' : `${minutes * (hard ? 2 : 1)} cardio min`}`}
      </LogButton>
    </SettingsSheet>
  )
}

// The sports you've added: the ones you logged lately first, then the rest
// A–Z, with search. "Add a new one" opens a name box here (search text
// carries over) and Save to my list; Add picks it. Edit puts an ✕ on each
// to take it off your list; sessions logged with one stay.
function SportList({ store, picked, onPick, onForget, onClose }) {
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [keep, setKeep] = useState(true)
  const fresh = name.trim()
  // A name already on a list is just picked.
  const known = store.sportNames.find(c => c.toLowerCase() === fresh.toLowerCase())
  function addNew() {
    if (known) return onPick(known)
    if (keep) store.saveSport(fresh)
    onPick(fresh, keep)
  }
  const own = store.ownSports
  const match = c => c.toLowerCase().includes(q.trim().toLowerCase())
  const recent = store.recentSports.filter(c => own.includes(c)).slice(0, 5).filter(match)
  const rest = [...own].sort((a, b) => a.localeCompare(b)).filter(c => match(c) && !recent.includes(c))
  const row = c => {
    const removable = editing
    return (
      <div key={c} className="flex items-center gap-1">
        <button
          onClick={() => { if (!editing) onPick(c) }}
          className={`flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-base transition-colors ${
            picked === c && !editing ? 'bg-lime-50 text-lime-800 font-semibold' : 'text-stone-800 active:bg-stone-100'
          }`}
        >
          <TypeIcon name={c} />
          <span className="flex-1 truncate">{c}</span>
          {picked === c && !editing && <span className="text-lime-700">✓</span>}
        </button>
        {removable && (
          <button
            onClick={() => onForget(c)}
            aria-label={`Remove ${c} from your list`}
            className="w-8 h-8 shrink-0 rounded-full bg-stone-100 text-stone-500 text-sm flex items-center justify-center active:bg-stone-200"
          >
            ✕
          </button>
        )}
      </div>
    )
  }
  return (
    <SettingsSheet title="Other sports" closeLabel="Cancel" tall onClose={onClose}>
      {own.length === 0 && <p className="text-sm text-stone-400">Sports you add show here, for next time.</p>}
      {own.length > 0 && <div className="flex items-center gap-2">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search sports"
          className="flex-1 min-w-0 rounded-xl bg-stone-100 px-3 py-2.5 text-base text-stone-900 outline-none placeholder:text-stone-400"
        />
        {own.length > 0 && (
          <button onClick={() => setEditing(!editing)} className="px-2 text-sm font-semibold text-accent-500 active:opacity-70">
            {editing ? 'Done' : 'Edit'}
          </button>
        )}
      </div>}
      {editing && <p className="text-xs text-stone-400">Tap ✕ to take a sport off your list. Sessions you logged with it stay.</p>}
      {recent.length > 0 && (
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wider font-medium px-1 mb-1">Recent</p>
          {recent.map(row)}
        </div>
      )}
      {rest.length > 0 && (
        <div>
          {recent.length > 0 && <p className="text-xs text-stone-400 uppercase tracking-wider font-medium px-1 mb-1">The rest</p>}
          {rest.map(row)}
        </div>
      )}
      {adding ? (
        <div className="space-y-3 rounded-2xl bg-stone-50 p-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="What was it? (Climbing, Kayaking…)"
            autoFocus
            maxLength={24}
            className="w-full rounded-xl bg-white px-3 py-2.5 text-base text-stone-900 outline-none placeholder:text-stone-400"
          />
          <ToggleRow
            label="Save to my list"
            detail={keep ? 'It’ll be here next time' : 'Just this once, like an adventure course'}
            on={keep}
            onChange={setKeep}
          />
          <button
            onClick={addNew}
            disabled={!fresh}
            className="w-full py-3 rounded-xl bg-accent-500 text-white font-semibold active:bg-accent-600 disabled:bg-stone-200 disabled:text-stone-400"
          >
            {fresh ? (known ? `Pick ${known}` : `Add ${fresh}`) : 'Name it to add it'}
          </button>
        </div>
      ) : !editing && (
        <button
          onClick={() => { setName(q.trim()); setAdding(true) }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-base font-semibold text-accent-500 border-[1.5px] border-dashed border-stone-200 active:bg-stone-50"
        >
          <span className="text-lg leading-none">+</span>
          {q.trim() ? `Add “${q.trim()}”` : 'Add a new one'}
        </button>
      )}
    </SettingsSheet>
  )
}

// An edit sheet's title: the day and what it is, as "Tuesday · Run".
// Its day and Delete live on the screen before it (see LineMenu).
const editTitle = (at, name) => `${at ? weekdayOf(at) : 'Earlier'} · ${name}`

// Logs a stretch session on your own; 30+ minutes also counts as a workout.
export function AddStretchSheet({ store, edit, onClose }) {
  const [minutes, setMinutes] = useState(edit?.entry.minutes ?? store.lastOwnStretch)
  const [at, setAt] = useState(edit?.entry.at ?? store.today.toISOString())
  const need = STRETCH_WORKOUT_MINUTES - minutes
  return (
    <SettingsSheet title={edit ? editTitle(edit.entry.at, 'Stretch') : 'Add stretching'} closeLabel="Cancel" onClose={onClose}>
      <StepperRow label="Length" value={minutes} step={5} min={5} max={240} editable suffix=" min" onChange={setMinutes} />
      {need > 0 ? (
        <p className="text-sm text-stone-500">
          {need} more {need === 1 ? 'minute' : 'minutes'} to count as a workout
          <span className="text-stone-400"> (stretching needs {STRETCH_WORKOUT_MINUTES})</span>
        </p>
      ) : (
        <p className="text-sm font-semibold text-emerald-700">✓ Counts as a workout</p>
      )}
      {!edit && <DayPicker now={store.today} dayLog={store.dayLog} at={at} onChange={setAt} />}
      <LogButton
        onSave={() => {
          if (edit) store.editOwnStretch(edit.index, { minutes, at })
          else store.addOwnStretch(minutes, at)
          onClose()
        }}
      >
        {edit ? 'Save' : 'Add'} {minutes} min · {need > 0 ? 'stretch day' : 'counts as a workout'}
      </LogButton>
    </SettingsSheet>
  )
}
