import { useState } from 'react'
import { CLASS_AREAS, FULL_BODY_BY_ID, STRETCH_ROUTINE, COOL_DOWN_BY_ID, cardioIsWorkout, classIsWorkout, STRETCH_WORKOUT_MINUTES } from '../../data/workout'
import { SettingsSheet } from '../ui/Sheet'
import { DayPicker } from '../ui/DayPicker'
import { LogButton } from '../ui/LogButton'
import { WorkoutMark } from '../ui/Icons'
import { weekdayOf } from '../../utils/days'

const effort = hard => (hard ? 'hard' : 'easy')
const areasOf = areas => (areas.length === CLASS_AREAS.length ? 'Full body' : CLASS_AREAS.filter(a => areas.includes(a.id)).map(a => a.label).join(' & '))
// A session's short name for the title; which one it was goes underneath.
const nameOf = id => (COOL_DOWN_BY_ID[id] ? 'Cool Down' : FULL_BODY_BY_ID[id] ? 'Full Body' : STRETCH_ROUTINE.name)
const kindOf = id => (COOL_DOWN_BY_ID[id] ? `After a ${COOL_DOWN_BY_ID[id].label.toLowerCase()}` : FULL_BODY_BY_ID[id]?.label)

// What a logged line is, for the screens below: its name, a short line of
// what it was, its day, whether it counted as a workout (only for things
// that sometimes don't), and how to edit, move and delete it. `item` is
// { kind, index, entry } for something logged with + (kind: class, walk,
// other, sport, stretch, rest), { kind: 'session', index } for a filed
// session, or { kind: 'open', id } for the newest finished one of a kind.
function describe(store, item) {
  const { kind, index, entry } = item
  if (kind === 'class') {
    const areas = entry.strength ? entry.areas ?? [] : []
    return {
      name: 'Class', what: 'class', at: entry.at, workout: classIsWorkout(entry),
      sub: [entry.cardio && `${entry.minutes} min ${effort(entry.hard)} cardio`, areas.length > 0 && areasOf(areas), entry.stretch && `Stretch${entry.stretchMinutes ? ` ${entry.stretchMinutes} min` : ''}`].filter(Boolean).join(' · '),
      edit: 'sheet', move: at => store.editClass(index, { at }), remove: () => store.deleteClass(index),
    }
  }
  if (kind === 'walk' || kind === 'other' || kind === 'sport') {
    const type = entry.type && entry.type !== 'Other' ? entry.type : null
    return {
      name: kind === 'walk' ? 'Walk' : type ?? 'Cardio', what: kind === 'walk' ? 'walk' : 'session', at: entry.at,
      workout: kind === 'walk' ? undefined : cardioIsWorkout(entry),
      sub: `${entry.minutes} min ${effort(entry.hard)}`,
      edit: 'sheet', move: at => store.editCardio(kind, index, { at }), remove: () => store.deleteCardio(kind, index),
    }
  }
  if (kind === 'stretch') {
    return {
      name: 'Stretch', what: 'stretch', at: entry.at, workout: (entry.minutes ?? 0) >= STRETCH_WORKOUT_MINUTES,
      sub: entry.minutes !== null ? `${entry.minutes} min` : '',
      edit: 'sheet', move: at => store.editOwnStretch(index, { at }), remove: () => store.deleteOwnStretch(index),
    }
  }
  if (kind === 'rest') {
    return { name: 'Rest day', what: 'rest day', at: entry.at, sub: '', edit: null, move: at => store.editRest(index, at), remove: () => store.deleteRest(index) }
  }
  // Sessions of the full-body days, the Full Body Stretch and the cool-downs.
  const x = kind === 'session' ? store.sessions.find(y => y.index === index) : store.currentSession(item.id)
  if (!x) return null
  const full = !!FULL_BODY_BY_ID[x.id]
  const reopen = kind === 'session' ? store.canReopen(index) : 'ok'
  return {
    name: nameOf(x.id), what: 'session', at: x.at, id: x.id,
    workout: x.id === STRETCH_ROUTINE.id ? x.counts : undefined,
    sub: [kindOf(x.id), full ? `${x.done}/${x.total} sets · ${x.stretched}/${x.stretches} stretches` : `${x.stretched}/${x.stretches} stretches · ${x.minutes} min`].filter(Boolean).join(' · '),
    edit: 'session', busy: reopen === 'busy',
    open: () => { if (kind === 'session') store.reopen(index) },
    move: at => (kind === 'session' ? store.moveSession(index, at) : store.setPlanDay(x.id, at)),
    remove: () => (kind === 'session' ? store.deleteSession(index) : store.clearSession(x.id)),
  }
}

// Tapping something you logged: what do you want to do? Edit opens
// its edit sheet (`onEdit`), or for a session the session itself
// (`onOpenWorkout`); Change day picks a day here; Delete asks once more.
export function LineMenu({ store, item, onEdit, onOpenWorkout, onClose }) {
  const [mode, setMode] = useState('menu')
  const [sure, setSure] = useState(false)
  const d = describe(store, item)
  const [at, setAt] = useState(d?.at ?? store.today.toISOString())
  if (!d) return null
  const title = `${d.at ? weekdayOf(d.at) : 'Earlier'} · ${d.name}`

  if (mode === 'day') {
    return (
      <SettingsSheet title="Change day" closeLabel="Cancel" onClose={onClose}>
        <p className="text-sm text-stone-500 -mt-1">{[title, d.sub].filter(Boolean).join(' · ')}</p>
        <DayPicker now={store.today} dayLog={store.dayLog} at={at} onChange={setAt} />
        {item.kind === 'rest' ? (
          <SaveButton onClick={() => { d.move(at); onClose() }} />
        ) : (
          <LogButton store={store} at={at} verb="Save" onSave={() => { d.move(at); onClose() }}>Save</LogButton>
        )}
      </SettingsSheet>
    )
  }

  return (
    <SettingsSheet title={title} closeLabel="Cancel" onClose={onClose}>
      {(d.workout || d.sub) && (
        <div className="-mt-1 space-y-1">
          {d.workout && <p className="flex items-center gap-2 text-sm font-medium text-stone-700"><WorkoutMark />Counts as a workout</p>}
          {d.sub && <p className="text-sm text-stone-500">{d.sub}</p>}
        </div>
      )}
      <div className="rounded-2xl bg-stone-50 divide-y divide-stone-100 overflow-hidden">
        {d.edit && (
          <Choice
            icon={<path d="M4 20h4L19 9l-4-4L4 16z" />}
            disabled={d.busy}
            note={d.busy ? 'Finish the one under way first' : undefined}
            onClick={() => {
              if (d.edit === 'sheet') return onEdit(item)
              d.open()
              onClose()
              onOpenWorkout(d.id)
            }}
          >
            Edit
          </Choice>
        )}
        <Choice icon={<><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>} onClick={() => setMode('day')}>Change day</Choice>
        {sure ? (
          <button onClick={() => { d.remove(); onClose() }} className="w-full py-3.5 bg-red-600 text-white font-semibold active:bg-red-700">
            Tap again to delete this {d.what}
          </button>
        ) : (
          <Choice icon={<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />} red onClick={() => setSure(true)}>Delete</Choice>
        )}
      </div>
    </SettingsSheet>
  )
}

function Choice({ icon, red, disabled, note, onClick, children }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`w-full flex items-center gap-3 px-4 py-3.5 text-left text-[16px] font-medium active:bg-stone-100 disabled:opacity-40 ${red ? 'text-red-600' : 'text-stone-900'}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">{icon}</svg>
      <span className="flex-1 min-w-0">
        {children}
        {note && <span className="block text-xs font-normal text-stone-400">{note}</span>}
      </span>
      {!red && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-stone-300 shrink-0" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>}
    </button>
  )
}

function SaveButton({ onClick }) {
  return (
    <button onClick={onClick} className="w-full py-3.5 rounded-2xl bg-accent-500 text-white font-semibold active:bg-accent-600 transition-colors">
      Save
    </button>
  )
}
