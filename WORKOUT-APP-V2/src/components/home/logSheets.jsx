import { useState } from 'react'
import { CLASS_AREAS, CLASS_DEFAULT, CARDIO_TYPES, CARDIO_WORKOUT_MINUTES, cardioIsWorkout, CLASS_STRETCH_WORKOUT_MINUTES, classIsWorkout, STRETCH_WORKOUT_MINUTES } from '../../data/workout'
import { SettingsSheet } from '../ui/Sheet'
import { StepperRow, Segmented, ToggleRow } from '../ui/controls'
import { TypeIcon } from '../ui/Icons'
import { weekDays, sameDay, weekdayOf } from '../../utils/days'
import { TAB_DOT, tabsOf } from '../../utils/dayKinds'
import { DayPicker } from '../ui/DayPicker'
import { Heads, LogButton } from '../ui/LogButton'

const EFFORT = [['easy', 'Easy'], ['hard', 'Hard']]

function EffortNote() {
  return (
    <p className="text-sm text-stone-400 leading-relaxed">
      Easy: you can still talk. Hard: only a few words at a time. Hard minutes count double toward
      the 300-minute cardio goal.
    </p>
  )
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

  function toggleArea(id) {
    set({ areas: c.areas.includes(id) ? c.areas.filter(x => x !== id) : [...c.areas, id] })
  }

  const strengthOn = c.strength && c.areas.length > 0
  const workout = classIsWorkout(c)
  const nothing = !c.cardio && !strengthOn && !c.stretch
  // Stretching alone: how many more minutes until it counts as a workout.
  const need = c.stretch && !c.cardio && !strengthOn ? CLASS_STRETCH_WORKOUT_MINUTES - c.stretchMinutes : 0

  // Strength with no areas picked would light nothing up, so it doesn't count.
  function log() {
    const answers = { ...c, strength: c.strength && c.areas.length > 0, areas: c.strength ? c.areas : [] }
    if (edit) store.editClass(edit.index, answers)
    else store.logClass(answers)
    onClose()
  }

  const counts = c.cardio ? `${c.minutes * (c.hard ? 2 : 1)} cardio min` : workout ? 'counts as a workout' : c.stretch ? 'stretch day only' : ''
  const chip = on => `px-3 py-1.5 rounded-xl text-sm font-semibold border-[1.5px] transition-colors ${
    on ? 'bg-orange-50 text-orange-700 border-orange-300' : 'bg-stone-100 text-stone-500 border-transparent'
  }`

  return (
    <SettingsSheet title={edit ? 'Edit class' : 'Log a class'} closeLabel="Cancel" tall onClose={onClose}>
      <div className="space-y-4">
        <ToggleRow label="Cardio" on={c.cardio} onChange={v => set({ cardio: v })} />
        {c.cardio && (
          <>
            <StepperRow label="Length" value={c.minutes} step={5} min={5} max={240} editable suffix=" min" onChange={v => set({ minutes: v })} />
            <Segmented label="Effort" value={c.hard ? 'hard' : 'easy'} options={EFFORT} onChange={v => set({ hard: v === 'hard' })} />
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
          <div className="flex flex-wrap gap-2">
            {CLASS_AREAS.map(a => (
              <button key={a.id} onClick={() => toggleArea(a.id)} className={chip(c.areas.includes(a.id))}>{a.label}</button>
            ))}
            <button onClick={() => set({ areas: full ? [] : all })} className={chip(full)}>Full body</button>
          </div>
        )}
      </div>
      <div className="space-y-4 pt-5 border-t border-stone-100">
        <ToggleRow
          label="Stretching"
          detail="Yoga, mobility. Counts as a stretch day."
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
      <DayPicker now={store.today} dayLog={store.dayLog} at={c.at} onChange={at => set({ at })} />
      <LogButton store={store} at={c.at} verb={edit ? 'Save' : 'Log'} disabled={nothing} onSave={log}>
        {nothing ? 'Turn on what you did' : `${edit ? 'Save' : 'Log class'}${counts && ` · ${counts}`}`}
      </LogButton>
      {edit && <DeleteButton what="class" onDelete={() => { store.deleteClass(edit.index); onClose() }} />}
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
  // What it was. Sports: one of the list, or a name typed under Other.
  const choices = isSport ? store.sportNames : CARDIO_TYPES
  const [type, setType] = useState(isWalk ? null : start.type ?? (edit ? null : choices[0]))
  const [typing, setTyping] = useState(false)
  const [name, setName] = useState('')
  const picked = typing ? name.trim() : type

  const workout = !isWalk && cardioIsWorkout({ minutes, hard })
  const need = CARDIO_WORKOUT_MINUTES[hard ? 'hard' : 'easy'] - minutes

  function add() {
    const what = picked || undefined
    if (edit) store.editCardio(kind, edit.index, { minutes, hard, at, ...(what && { type: what }) })
    else if (isWalk) store.addWalk(minutes, hard, at)
    else if (isSport) store.addSport(minutes, hard, at, what)
    else store.addOtherCardio(minutes, hard, at, what)
    onClose()
  }

  const title = isWalk ? (edit ? 'Edit walk' : 'Add a walk') : isSport ? (edit ? 'Edit sport or hike' : 'Add a sport or hike') : edit ? 'Edit cardio' : 'Add cardio'
  // A tile per choice: its icon and name, the picked one outlined in the card's color.
  const tile = on => `flex flex-col items-center gap-1 rounded-xl px-1 pt-2.5 pb-2 border-[1.5px] text-[11.5px] font-semibold transition-colors min-w-0 ${
    on ? (isSport ? 'bg-lime-50 text-lime-800 border-lime-600' : 'bg-cyan-50 text-cyan-700 border-cyan-600') : 'bg-stone-100 text-stone-500 border-transparent active:bg-stone-200'
  }`
  return (
    <SettingsSheet title={title} closeLabel="Cancel" onClose={onClose}>
      {!isWalk && (
        <div className="space-y-2">
          <span className="text-base text-stone-600">What did you do?</span>
          <div className="grid grid-cols-4 gap-1.5">
            {choices.map(c => (
              <button key={c} onClick={() => { setType(c); setTyping(false) }} aria-pressed={!typing && type === c} className={tile(!typing && type === c)}>
                <TypeIcon name={c} />
                <span className="w-full truncate text-center">{c}</span>
              </button>
            ))}
            {/* Sports: anything else, by name, kept for next time. */}
            {isSport && (
              <button onClick={() => setTyping(true)} aria-pressed={typing} className={tile(typing)}>
                <TypeIcon name="Other" />
                <span>Other</span>
              </button>
            )}
          </div>
          {typing && (
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="What was it? (Climbing, Kayaking…)"
              autoFocus
              maxLength={24}
              className="w-full rounded-xl bg-stone-100 px-3 py-2.5 text-base text-stone-900 outline-none placeholder:text-stone-400"
            />
          )}
        </div>
      )}
      <StepperRow label="Length" value={minutes} step={5} min={5} max={480} editable suffix=" min" onChange={setMinutes} />
      <Segmented label="Effort" value={hard ? 'hard' : 'easy'} options={EFFORT} onChange={v => setHard(v === 'hard')} />
      {/* 30 min hard or 45 easy makes it a workout, not just cardio minutes. */}
      {isWalk ? null : workout ? (
        <p className="text-sm font-semibold text-emerald-700">✓ Counts as a workout</p>
      ) : (
        <p className="text-sm text-stone-500">
          {need} more {need === 1 ? 'minute' : 'minutes'} to count as a workout
          <span className="text-stone-400"> ({CARDIO_WORKOUT_MINUTES.hard} hard or {CARDIO_WORKOUT_MINUTES.easy} easy)</span>
        </p>
      )}
      <EffortNote />
      <DayPicker now={store.today} dayLog={store.dayLog} at={at} onChange={setAt} />
      <LogButton store={store} at={at} verb={edit ? 'Save' : 'Add'} disabled={isSport && !picked} onSave={add}>
        {isSport && !picked ? 'Name it to add it' : picked && picked !== 'Other'
          // Whether it counts shows just above, so a named one keeps the button short.
          ? `${edit ? 'Save' : 'Add'} ${picked} · ${minutes} min`
          : `${edit ? 'Save' : 'Add'} ${minutes} min · ${workout ? 'counts as a workout' : `${minutes * (hard ? 2 : 1)} cardio min`}`}
      </LogButton>
      {edit && <DeleteButton what={isWalk ? 'walk' : 'session'} onDelete={() => { store.deleteCardio(kind, edit.index); onClose() }} />}
    </SettingsSheet>
  )
}

// Which day of the week something happened: Mon–Sun, days still to come
// greyed out. Today keeps the time you logged it. `now` is today, or a past
// week's last day.
// Deleting asks once more, in place.
// Adds a rest day, or moves or deletes one: which day was it?
export function RestSheet({ store, edit, onClose }) {
  const [at, setAt] = useState(edit?.entry.at ?? store.today.toISOString())
  const day = weekDays(store.today).findIndex(d => sameDay(d, new Date(at)))
  const there = (store.dayLog[day] ?? []).filter(x => x.kind !== 'rest')
  return (
    <SettingsSheet title={edit ? 'Edit rest day' : 'Add a rest day'} closeLabel="Cancel" onClose={onClose}>
      <DayPicker now={store.today} dayLog={store.dayLog} at={at} onChange={setAt} />
      {there.length > 0 && (
        <Heads title={`${weekdayOf(at)} already has`}>
          <ul className="space-y-1">
            {there.flatMap(x => [
              [x.label, tabsOf([{ kind: x.kind }])[0]],
              ...(x.tags ?? []).filter(t => t.kind !== 'strength').map(t => [t.text, t.kind]),
            ]).map(([text, tab], i) => (
              <li key={i} className="flex items-center gap-2 text-stone-600">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TAB_DOT[tab]}`} />
                {text}
              </li>
            ))}
          </ul>
          <p className="text-stone-600">Still mark it as a rest day?</p>
        </Heads>
      )}
      <button
        onClick={() => {
          if (edit) store.editRest(edit.index, at)
          else store.addRest(at)
          onClose()
        }}
        className="w-full py-3.5 rounded-2xl bg-accent-500 text-white font-semibold active:bg-accent-600 transition-colors"
      >
        {edit ? 'Save' : 'Add rest day'}{there.length > 0 && ' anyway'}
      </button>
      {edit && <DeleteButton what="rest day" onDelete={() => { store.deleteRest(edit.index); onClose() }} />}
    </SettingsSheet>
  )
}

function DeleteButton({ what, onDelete }) {
  const [sure, setSure] = useState(false)
  return (
    <button
      onClick={() => (sure ? onDelete() : setSure(true))}
      className="w-full py-3 rounded-2xl bg-red-50 text-red-600 text-sm font-semibold active:bg-red-100 transition-colors"
    >
      {sure ? `Tap again to delete this ${what}` : `Delete ${what}`}
    </button>
  )
}

// Logs a stretch session on your own; 30+ minutes also counts as a workout.
export function AddStretchSheet({ store, edit, onClose }) {
  const [minutes, setMinutes] = useState(edit?.entry.minutes ?? store.lastOwnStretch)
  const [at, setAt] = useState(edit?.entry.at ?? store.today.toISOString())
  const need = STRETCH_WORKOUT_MINUTES - minutes
  return (
    <SettingsSheet title={edit ? 'Edit stretching' : 'Add stretching'} closeLabel="Cancel" onClose={onClose}>
      <StepperRow label="Length" value={minutes} step={5} min={5} max={240} editable suffix=" min" onChange={setMinutes} />
      {need > 0 ? (
        <p className="text-sm text-stone-500">
          {need} more {need === 1 ? 'minute' : 'minutes'} to count as a workout
          <span className="text-stone-400"> (stretching needs {STRETCH_WORKOUT_MINUTES})</span>
        </p>
      ) : (
        <p className="text-sm font-semibold text-emerald-700">✓ Counts as a workout</p>
      )}
      <DayPicker now={store.today} dayLog={store.dayLog} at={at} onChange={setAt} />
      <LogButton
        store={store}
        at={at}
        verb={edit ? 'Save' : 'Add'}
        onSave={() => {
          if (edit) store.editOwnStretch(edit.index, { minutes, at })
          else store.addOwnStretch(minutes, at)
          onClose()
        }}
      >
        {edit ? 'Save' : 'Add'} {minutes} min · {need > 0 ? 'stretch day' : 'counts as a workout'}
      </LogButton>
      {edit && <DeleteButton what="session" onDelete={() => { store.deleteOwnStretch(edit.index); onClose() }} />}
    </SettingsSheet>
  )
}
