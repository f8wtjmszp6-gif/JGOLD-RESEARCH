import { useState } from 'react'
import { workouts, GYM_ORDER, activities, STRETCH_ROUTINE, COOL_DOWNS, CLASS_AREAS, CARDIO_WORKOUT_MINUTES, cardioIsWorkout, CLASS_STRETCH_WORKOUT_MINUTES, classIsWorkout, STRETCH_WORKOUT_MINUTES, CLASS_DEFAULT } from '../data/workout'
import { SettingsSheet, StepperRow, Segmented, ToggleRow } from './WorkoutDetail'
import { TileIcon } from './Icons'
import WeekStrip from './WeekStrip'
import { weekDays, sameDay, dayLabel, inDayOrder } from '../utils/days'

// The homepage shows one group at a time, picked by these tabs. The last tab
// you used is remembered on this device.
const TABS = [['gym', 'Gym'], ['cardio', 'Cardio'], ['stretch', 'Stretch'], ['rest', 'Rest']]
const TAB_KEY = 'workout-v2-home-tab'
function savedTab() {
  try {
    const t = localStorage.getItem(TAB_KEY)
    return TABS.some(([id]) => id === t) ? t : 'gym'
  } catch {
    return 'gym'
  }
}

// What in each tab counts toward the This week goals, shown from ⓘ as one
// table: a row per tab, a column per goal (null: doesn't count).
const WHAT_COUNTS = [
  ['gym', ['Finish a plan or log a class', 'Finish a plan’s stretches or log a class', 'Finish a plan’s warm-up or log class cardio']],
  ['cardio', [`Log ${CARDIO_WORKOUT_MINUTES.hard} min hard or ${CARDIO_WORKOUT_MINUTES.easy} easy`, null, 'Log any walk or session']],
  ['stretch', [`Stretch ${STRETCH_WORKOUT_MINUTES}+ min`, 'Finish the routine or a cool-down, or log a session', null]],
]

export default function Home({ store, onOpenWorkout }) {
  const [tab, setTabState] = useState(savedTab)
  const [showCounts, setShowCounts] = useState(false)
  function setTab(t) {
    setTabState(t)
    try {
      localStorage.setItem(TAB_KEY, t)
    } catch {
      // Private browsing: the tab just isn't remembered.
    }
  }
  // The open sheet: { type: 'class' | 'walk' | 'other' | 'stretch', edit? },
  // where `edit` is { index, entry } when changing something already logged.
  const [sheet, setSheet] = useState(null)
  const open = (type, edit) => setSheet({ type, edit })
  const close = () => setSheet(null)
  const byId = id => activities.find(a => a.id === id)
  const walk = byId('walk')
  const walks = store.walks
  const other = store.otherCardio
  const otherMinutes = store.getCardioMinutes('other')

  return (
    <div className="h-full flex flex-col">
      {/* The tabs stay put; only what's under them scrolls. */}
      <div className="shrink-0 px-5 pb-3">
        <WeekStrip dayLog={store.dayLog} />
      </div>
      <div className="shrink-0 px-5 pb-3 flex items-center gap-2">
        <div className="flex-1 bg-stone-100 rounded-xl p-1 flex" role="tablist">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCounts(true)}
          aria-label="What counts toward your goals"
          className="w-10 h-10 rounded-xl bg-white shadow-sm text-stone-400 flex items-center justify-center active:bg-stone-100 shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9.5" /><path d="M12 11v5.5M12 7.6v.1" strokeWidth="2.4" /></svg>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-1 pb-6">
        {tab === 'gym' && <>
          <Section title="Workout plans">
            {GYM_ORDER.map(id => (
              <WorkoutCard
                key={id}
                workout={workouts[id]}
                progress={store.workoutProgress(id)}
                stretches={store.getStretches(id)}
                stretchesDone={store.getStretches(id).filter(x => store.getStretchDone(id, x.id)).length}
                onOpen={() => onOpenWorkout(id)}
              />
            ))}
          </Section>

          <Section title="Gym class">
            <ClassCard store={store} activity={byId('class')} onAdd={() => open('class')} onEdit={edit => open('class', edit)} />
          </Section>
        </>}

        {tab === 'cardio' && (
          <Section title="Cardio">
            {/* Each walk is logged with its own length: + asks how long. */}
            <ActivityCard
              activity={walk}
              icon="walk"
              count={walks.length}
              detail={walks.length ? `${walks.length} ${walks.length === 1 ? walk.one : walk.many} · ${store.getCardioMinutes('walk')} min` : undefined}
              onAdd={() => open('walk')}
              onRemove={() => store.removeActivity('walk')}
            >
              {walks.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1.5">
                  {inDayOrder(walks).map(e => <CardioLine key={e.index} session={e.entry} showWorkout={false} onEdit={() => open('walk', e)} />)}
                </div>
              )}
            </ActivityCard>
            <ActivityCard
              activity={OTHER_CARDIO}
              icon="cardio"
              count={other.length}
              detail={other.length ? `${other.length} ${other.length === 1 ? 'session' : 'sessions'} · ${otherMinutes} min` : undefined}
              onAdd={() => open('other')}
              onRemove={store.removeOtherCardio}
            >
              {other.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1.5">
                  {inDayOrder(other).map(e => <CardioLine key={e.index} session={e.entry} onEdit={() => open('other', e)} />)}
                </div>
              )}
            </ActivityCard>
          </Section>
        )}

        {tab === 'stretch' && (
          <Section title="Stretching">
            <RoutineCard store={store} onOpen={() => onOpenWorkout(STRETCH_ROUTINE.id)} />
            <CoolDownCard store={store} onOpen={id => (id ? onOpenWorkout(id) : open('cool'))} />
            <ActivityCard
              activity={OWN_STRETCH}
              icon="stretch"
              count={store.ownStretches.length}
              detail={store.ownStretches.length ? ownDetail(store.ownStretches) : undefined}
              onAdd={() => open('stretch')}
              onRemove={store.removeOwnStretch}
            >
              {store.ownStretches.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1.5">
                  {inDayOrder(store.ownStretches).map(e => <StretchLine key={e.index} session={e.entry} onEdit={() => open('stretch', e)} />)}
                </div>
              )}
            </ActivityCard>
          </Section>
        )}

        {tab === 'rest' && (
          <Section title="Rest">
            {/* + asks which day; each rest day is listed, tap one to move it. */}
            <ActivityCard
              activity={byId('rest')}
              icon="rest"
              count={store.restDays.length}
              onAdd={() => open('rest')}
              onRemove={() => store.removeActivity('rest')}
            >
              {store.restDays.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1.5">
                  {inDayOrder(store.restDays.map(at => ({ at }))).map(e => (
                    <LineButton key={e.index} label={`${dayLabel(e.entry.at)} rest day`} onEdit={() => open('rest', e)}>
                      <span className="w-12 font-semibold text-stone-600">{dayLabel(e.entry.at)}</span>
                      <span className="text-stone-500">Rest day</span>
                    </LineButton>
                  ))}
                </div>
              )}
            </ActivityCard>
          </Section>
        )}

      </div>

      {showCounts && <WhatCountsSheet tab={tab} onClose={() => setShowCounts(false)} />}
      {sheet?.type === 'other' && <AddCardioSheet store={store} edit={sheet.edit} onClose={close} />}
      {sheet?.type === 'stretch' && <AddStretchSheet store={store} edit={sheet.edit} onClose={close} />}
      {sheet?.type === 'class' && <LogClassSheet store={store} edit={sheet.edit} onClose={close} />}
      {sheet?.type === 'cool' && <CoolDownSheet store={store} onPick={id => { close(); onOpenWorkout(id) }} onClose={close} />}
      {sheet?.type === 'rest' && <RestSheet store={store} edit={sheet.edit} onClose={close} />}
      {sheet?.type === 'walk' && <AddCardioSheet kind="walk" store={store} edit={sheet.edit} onClose={close} />}
    </div>
  )
}

// Cardio that isn't a class or a walk: a run, a ride, a swim.
const OTHER_CARDIO = {
  id: 'otherCardio',
  name: 'Other cardio',
  note: 'Run, bike, swim, elliptical',
  one: 'session',
  many: 'sessions',
  tile: 'from-cyan-50 to-cyan-100',
}

const EFFORT = [['easy', 'Easy'], ['hard', 'Hard']]

function EffortNote() {
  return (
    <p className="text-sm text-stone-400 leading-relaxed">
      Easy: you can still talk. Hard: only a few words at a time. Hard minutes count double toward
      the 300-minute cardio goal.
    </p>
  )
}

// ── Workout classes ──────────────────────────────────────────────────────────
// + opens Log a class; the card lists each class this week with its answers.
function ClassCard({ store, activity, onAdd, onEdit }) {
  const classes = store.classes
  const n = classes.length
  return (
    <ActivityCard
      activity={activity}
      icon="class"
      count={n}
      detail={n ? `${n} ${n === 1 ? activity.one : activity.many} · ${store.getCardioMinutes('class')} min` : undefined}
      onAdd={onAdd}
      onRemove={() => store.removeActivity('class')}
    >
      {n > 0 && (
        <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1.5">
          {inDayOrder(classes).map(e => <ClassLine key={e.index} entry={e.entry} onEdit={() => onEdit(e)} />)}
        </div>
      )}
    </ActivityCard>
  )
}

// "Upper · Core", or "Full body" when all three were worked.
function areasLabel(areas) {
  return areas.length === CLASS_AREAS.length
    ? 'Full body'
    : CLASS_AREAS.filter(a => areas.includes(a.id)).map(a => a.label).join(' · ')
}

const TAG = 'text-xs font-semibold px-2 py-0.5 rounded-md'

// A logged item's row: tap it to edit it or change its day.
function LineButton({ label, onEdit, children }) {
  return (
    <button onClick={onEdit} aria-label={`Edit ${label}`} className="w-full flex items-center gap-1.5 text-sm text-left rounded-lg -mx-1 px-1 py-0.5 active:bg-stone-100">
      <span className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">{children}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-stone-300 shrink-0"><path d="M9 18l6-6-6-6" /></svg>
    </button>
  )
}

// One class: its day, then a tag for each thing it was.
function ClassLine({ entry, onEdit }) {
  const day = dayLabel(entry.at)
  const strength = entry.strength && entry.areas.length > 0
  return (
    <LineButton label={`${day} class`} onEdit={onEdit}>
      <span className="w-12 font-semibold text-stone-600">{day}</span>
      {entry.cardio && <span className={`${TAG} bg-emerald-50 text-emerald-700`}>{entry.minutes} min {entry.hard ? 'hard' : 'easy'} cardio</span>}
      {strength && <span className={`${TAG} bg-orange-50 text-orange-700`}>{areasLabel(entry.areas)}</span>}
      {entry.stretch && <span className={`${TAG} bg-teal-50 text-teal-700`}>Stretch{entry.stretchMinutes ? ` ${entry.stretchMinutes} min` : ''}</span>}
      {!classIsWorkout(entry) && <span className="text-xs text-stone-400">Not a workout</span>}
    </LineButton>
  )
}

// One other-cardio session: its day, length and effort, and whether it was
// long enough to count as a workout.
// `showWorkout` is off for walks, which never count as workouts.
function CardioLine({ session, showWorkout = true, onEdit }) {
  const day = dayLabel(session.at)
  return (
    <LineButton label={`${day} ${session.kind === 'walk' ? 'walk' : 'cardio'}`} onEdit={onEdit}>
      <span className="w-12 font-semibold text-stone-600">{day}</span>
      <span className={`${TAG} bg-emerald-50 text-emerald-700`}>{session.minutes} min {session.hard ? 'hard' : 'easy'}</span>
      {showWorkout && cardioIsWorkout(session) && <span className={`${TAG} bg-cyan-50 text-cyan-700`}>Workout</span>}
    </LineButton>
  )
}

// What you did in a class: cardio (how long, how hard), strength (which
// areas) and stretching. Everything starts off; cardio remembers your last
// length and effort.
// With `edit`, it opens filled in with that class to change or delete.
function LogClassSheet({ store, edit, onClose }) {
  const [c, setC] = useState(() => (edit ? { ...CLASS_DEFAULT, ...edit.entry } : { ...store.getNewClass(), at: new Date().toISOString() }))
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
      <DayPicker at={c.at} onChange={at => set({ at })} />
      <button
        onClick={log}
        disabled={nothing}
        className="w-full py-3.5 rounded-2xl bg-accent-500 text-white font-semibold active:bg-accent-600 transition-colors disabled:bg-stone-200 disabled:text-stone-400"
      >
        {nothing ? 'Turn on what you did' : `${edit ? 'Save' : 'Log class'}${counts && ` · ${counts}`}`}
      </button>
      {edit && <DeleteButton what="class" onDelete={() => { store.deleteClass(edit.index); onClose() }} />}
    </SettingsSheet>
  )
}

// Logs a walk (kind "walk") or other cardio. Starts from the last one you
// added. Only other cardio can count as a workout, so only it shows how close
// it is.
function AddCardioSheet({ kind = 'other', store, edit, onClose }) {
  const isWalk = kind === 'walk'
  const start = edit?.entry ?? store.getCardioSetting(kind)
  const [minutes, setMinutes] = useState(start.minutes)
  const [hard, setHard] = useState(start.hard)
  const [at, setAt] = useState(edit?.entry.at ?? new Date().toISOString())

  const workout = !isWalk && cardioIsWorkout({ minutes, hard })
  const need = CARDIO_WORKOUT_MINUTES[hard ? 'hard' : 'easy'] - minutes

  function add() {
    if (edit) store.editCardio(kind, edit.index, { minutes, hard, at })
    else if (isWalk) store.addWalk(minutes, hard, at)
    else {
      store.addOtherCardio(minutes, hard, at)
      store.setCardioSetting('other', { minutes, hard })
    }
    onClose()
  }

  return (
    <SettingsSheet title={edit ? (isWalk ? 'Edit walk' : 'Edit cardio') : isWalk ? 'Add a walk' : 'Add cardio'} closeLabel="Cancel" onClose={onClose}>
      <StepperRow label="Length" value={minutes} step={5} min={5} max={240} editable suffix=" min" onChange={setMinutes} />
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
      <DayPicker at={at} onChange={setAt} />
      <button
        onClick={add}
        className="w-full py-3.5 rounded-2xl bg-accent-500 text-white font-semibold active:bg-accent-600 transition-colors"
      >
        {edit ? 'Save' : 'Add'} {minutes} min · {workout ? 'counts as a workout' : `${minutes * (hard ? 2 : 1)} cardio min`}
      </button>
      {edit && <DeleteButton what={isWalk ? 'walk' : 'session'} onDelete={() => { store.deleteCardio(kind, edit.index); onClose() }} />}
    </SettingsSheet>
  )
}

// Which day of this week something happened: Mon–Sun, days still to come
// greyed out. Today keeps the time you logged it.
function DayPicker({ at, onChange }) {
  const now = new Date()
  const picked = at ? new Date(at) : null
  return (
    <div className="space-y-2">
      <span className="text-base text-stone-600">Day</span>
      <div className="grid grid-cols-7 gap-1">
        {weekDays(now).map(d => {
          const today = sameDay(d, now)
          const future = !today && d > now
          const on = picked && sameDay(d, picked)
          return (
            <button
              key={d.getDate()}
              disabled={future}
              onClick={() => onChange(today ? now.toISOString() : d.toISOString())}
              aria-pressed={!!on}
              aria-label={d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              className={`rounded-xl py-1.5 text-center transition-colors disabled:opacity-30 ${
                on ? 'bg-accent-500 text-white' : 'bg-stone-100 text-stone-600 active:bg-stone-200'
              }`}
            >
              <span className="block text-[11px] font-medium">{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
              <span className="block text-sm font-semibold">{d.getDate()}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Deleting asks once more, in place.
// Adds a rest day, or moves or deletes one: which day was it?
function RestSheet({ store, edit, onClose }) {
  const [at, setAt] = useState(edit?.entry.at ?? new Date().toISOString())
  return (
    <SettingsSheet title={edit ? 'Edit rest day' : 'Add a rest day'} closeLabel="Cancel" onClose={onClose}>
      <DayPicker at={at} onChange={setAt} />
      <button
        onClick={() => {
          if (edit) store.editRest(edit.index, at)
          else store.addRest(at)
          onClose()
        }}
        className="w-full py-3.5 rounded-2xl bg-accent-500 text-white font-semibold active:bg-accent-600 transition-colors"
      >
        {edit ? 'Save' : 'Add rest day'}
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

// ⓘ: what counts toward each This week goal, for every tab at once. The tab
// you opened it from is highlighted; tab names run up the side so the goal
// columns get the room.
function WhatCountsSheet({ tab, onClose }) {
  const name = id => TABS.find(([t]) => t === id)[1]
  const side = id => (
    <td className={`w-7 py-2 text-center align-middle border-t border-stone-100 ${id === tab ? 'rounded-l-xl' : ''}`}>
      <span className={`inline-block [writing-mode:vertical-rl] rotate-180 text-xs font-semibold tracking-wide whitespace-nowrap ${id === tab ? 'text-accent-500' : 'text-stone-900'}`}>{name(id)}</span>
    </td>
  )
  const row = id => (id === tab ? 'bg-accent-50' : '')
  return (
    <SettingsSheet title="What counts" onClose={onClose}>
      <table className="w-full table-fixed border-separate border-spacing-0 text-[13px] leading-snug">
        <thead>
          <tr className="text-xs text-stone-500">
            <th className="w-7" />
            {['Workout', 'Stretch', 'Cardio'].map(h => <th key={h} className="px-1.5 pb-1.5 text-left font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {WHAT_COUNTS.map(([id, cells]) => (
            <tr key={id} className={row(id)}>
              {side(id)}
              {cells.map((c, i) => (
                <td key={i} className={`px-1.5 py-2.5 align-top border-t border-stone-100 ${c ? (id === tab ? 'text-stone-900' : 'text-stone-500') : 'text-stone-300'} ${id === tab && i === 2 ? 'rounded-r-xl' : ''}`}>
                  {c ?? '—'}
                </td>
              ))}
            </tr>
          ))}
          <tr className={row('rest')}>
            {side('rest')}
            <td colSpan={3} className={`px-1.5 py-2.5 align-middle border-t border-stone-100 ${tab === 'rest' ? 'text-stone-900 rounded-r-xl' : 'text-stone-400'}`}>
              Rest days don’t count toward any goal
            </td>
          </tr>
        </tbody>
      </table>
      <p className="text-xs text-stone-400">Hard cardio minutes count double.</p>
    </SettingsSheet>
  )
}

function Section({ title, children }) {
  return (
    <section className="mb-6">
      <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mb-2 px-1">{title}</p>
      <div className="space-y-2.5">{children}</div>
    </section>
  )
}

// Stretching done outside the app's lists — after a class, at home.
const OWN_STRETCH = {
  id: 'ownStretch',
  name: 'On my own',
  note: 'Stretched after a class or at home',
  one: 'session',
  many: 'sessions',
  tile: 'from-teal-50 to-teal-100',
}

// "2 sessions · 45 min" (sessions logged before lengths were asked add none).
function ownDetail(list) {
  const total = list.reduce((n, x) => n + (x.minutes ?? 0), 0)
  return `${list.length} ${list.length === 1 ? 'session' : 'sessions'}${total ? ` · ${total} min` : ''}`
}

// One session on your own: its day, length, and whether it was a workout.
function StretchLine({ session, onEdit }) {
  const day = dayLabel(session.at)
  return (
    <LineButton label={`${day} stretch session`} onEdit={onEdit}>
      <span className="w-12 font-semibold text-stone-600">{day}</span>
      {session.minutes !== null && <span className={`${TAG} bg-teal-50 text-teal-700`}>{session.minutes} min</span>}
      {session.minutes >= STRETCH_WORKOUT_MINUTES && <span className={`${TAG} bg-pink-50 text-pink-700`}>Workout</span>}
    </LineButton>
  )
}

// Logs a stretch session on your own; 30+ minutes also counts as a workout.
function AddStretchSheet({ store, edit, onClose }) {
  const [minutes, setMinutes] = useState(edit?.entry.minutes ?? store.lastOwnStretch)
  const [at, setAt] = useState(edit?.entry.at ?? new Date().toISOString())
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
      <DayPicker at={at} onChange={setAt} />
      <button
        onClick={() => {
          if (edit) store.editOwnStretch(edit.index, { minutes, at })
          else store.addOwnStretch(minutes, at)
          onClose()
        }}
        className="w-full py-3.5 rounded-2xl bg-accent-500 text-white font-semibold active:bg-accent-600 transition-colors"
      >
        {edit ? 'Save' : 'Add'} {minutes} min · {need > 0 ? 'stretch day' : 'counts as a workout'}
      </button>
      {edit && <DeleteButton what="session" onDelete={() => { store.deleteOwnStretch(edit.index); onClose() }} />}
    </SettingsSheet>
  )
}

function RoutineCard({ store, onOpen }) {
  const list = store.getStretches(STRETCH_ROUTINE.id)
  const done = list.filter(x => store.getStretchDone(STRETCH_ROUTINE.id, x.id)).length
  const complete = done === list.length
  // 30+ minutes (longer holds, more sets) makes the routine a workout too.
  const workout = store.routineMinutes >= STRETCH_WORKOUT_MINUTES
  return (
    <button onClick={onOpen} className="w-full text-left rounded-2xl px-4 py-3.5 bg-white shadow-sm transition-all active:scale-[0.98]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center shrink-0">
            <TileIcon id="stretch" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-stone-900">
              {STRETCH_ROUTINE.name}
              {complete && <span className="text-emerald-600 ml-1.5">✓</span>}
            </p>
            <p className="text-sm text-stone-400 truncate">
              {list.length} stretches · {store.routineMinutes} min{workout && <span className="text-pink-700"> · workout</span>}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-sm font-medium text-stone-500">{done}/{list.length}</span>
          <div className="w-16 h-1 bg-stone-100 rounded-full mt-1.5">
            <div
              className={`h-full rounded-full transition-all ${complete ? 'bg-emerald-400' : 'bg-teal-400'}`}
              style={{ width: `${(done / list.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  )
}

// A cool-down's progress this week: how many of its stretches are ticked.
function coolProgress(store, id) {
  const list = store.getStretches(id)
  const done = list.filter(x => store.getStretchDone(id, x.id)).length
  return { list, done, complete: list.length > 0 && done === list.length }
}

// Stretches for after cardio. Until you start one it lists the choices and
// tapping asks what you did; once one is under way it shows that one and
// opens straight to it.
function CoolDownCard({ store, onOpen }) {
  const all = COOL_DOWNS.map(c => ({ ...c, ...coolProgress(store, c.id) }))
  const current = all.find(c => c.done > 0 && !c.complete) ?? all.find(c => c.complete)
  const inProgress = current && !current.complete
  return (
    <button onClick={() => onOpen(inProgress ? current.id : null)} className="w-full text-left rounded-2xl px-4 py-3.5 bg-white shadow-sm transition-all active:scale-[0.98]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center shrink-0">
            <TileIcon id="stretch" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-stone-900">
              Cool-down
              {current?.complete && <span className="text-emerald-600 ml-1.5">✓</span>}
            </p>
            <p className="text-sm text-stone-400 truncate">
              {current
                ? `${current.label} · ${current.list.length} stretches · ${store.getListMinutes(current.id)} min`
                : 'After a walk, run, bike, swim or row'}
            </p>
          </div>
        </div>
        {current ? (
          <div className="text-right shrink-0">
            <span className="text-sm font-medium text-stone-500">{current.done}/{current.list.length}</span>
            <div className="w-16 h-1 bg-stone-100 rounded-full mt-1.5">
              <div
                className={`h-full rounded-full transition-all ${current.complete ? 'bg-emerald-400' : 'bg-teal-400'}`}
                style={{ width: `${(current.done / current.list.length) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-stone-300 shrink-0"><path d="M9 18l6-6-6-6" /></svg>
        )}
      </div>
    </button>
  )
}

// Picks which cool-down to do: you say what you just did.
function CoolDownSheet({ store, onPick, onClose }) {
  return (
    <SettingsSheet title="Cool-down" closeLabel="Cancel" onClose={onClose}>
      <p className="text-sm text-stone-500 -mt-1">What did you just do?</p>
      <div className="space-y-2">
        {COOL_DOWNS.map(c => {
          const { list, done, complete } = coolProgress(store, c.id)
          return (
            <button key={c.id} onClick={() => onPick(c.id)} className="w-full flex items-center gap-3 rounded-xl bg-stone-50 px-4 py-3 text-left active:bg-stone-100">
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-stone-900">
                  {c.label}
                  {complete && <span className="text-emerald-600 ml-1.5">✓</span>}
                </span>
                <span className="block text-sm text-stone-400">
                  {list.length} stretches · {store.getListMinutes(c.id)} min{done > 0 && !complete ? ` · ${done} done` : ''}
                </span>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-stone-300 shrink-0"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          )
        })}
      </div>
    </SettingsSheet>
  )
}

// Days stretched this week: finishing a gym workout's stretches, the
// full-body routine, or stretching on your own (+) each count once.
// Under the name: what's in the plan until you start it, then how far along
// you are. Both counts follow the plan as you add or remove exercises and
// stretches.
function WorkoutCard({ workout, progress, stretches, stretchesDone, onOpen }) {
  const { done, total, exercises } = progress
  const complete = total > 0 && done === total
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
  const started = done > 0 || stretchesDone > 0
  const detail = started
    ? `${done}/${total} sets · ${stretchesDone}/${stretches.length} ${stretches.length === 1 ? 'stretch' : 'stretches'}`
    : `${plural(exercises, 'exercise', 'exercises')} · ${plural(stretches.length, 'stretch', 'stretches')}`

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl px-4 py-3.5 bg-white shadow-sm transition-all active:scale-[0.98]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center shrink-0">
            <TileIcon id={workout.id} />
          </div>
          <div className="min-w-0">
          <p className="font-semibold text-stone-900">
            {workout.short}
            {complete && <span className="text-emerald-600 ml-1.5">✓</span>}
          </p>
          <p className="text-sm text-stone-400 truncate">{detail}</p>
          </div>
        </div>
        {/* Progress only: a bar that fills as you tick sets, no number. */}
        <div className="shrink-0">
          <div className="w-16 h-1 bg-stone-100 rounded-full">
            <div
              className={`h-full rounded-full transition-all ${complete ? 'bg-emerald-400' : 'bg-orange-400'}`}
              style={{ width: `${total ? (done / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  )
}

function ActivityCard({ activity, icon, count, detail, onAdd, onRemove, children }) {
  const active = count > 0

  return (
    <div className="w-full rounded-2xl px-4 py-3.5 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br ${activity.tile} flex items-center justify-center shrink-0`}>
            <TileIcon id={icon} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-stone-900 truncate">{activity.name}</p>
            <p className="text-sm text-stone-400 truncate">
              {detail ?? (active ? `${count} ${count === 1 ? activity.one : activity.many}` : activity.note)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {active && (
            <>
              <button
                onClick={onRemove}
                aria-label={`Remove a ${activity.one}`}
                className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-stone-600 text-lg font-medium active:bg-stone-100 transition-colors"
              >
                −
              </button>
              <span className="w-5 text-center text-lg font-bold text-stone-900">{count}</span>
            </>
          )}
          <button
            onClick={onAdd}
            aria-label={`Add a ${activity.one}`}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg font-medium transition-colors ${
              active
                ? 'bg-white shadow-sm text-stone-600 active:bg-stone-100'
                : 'bg-accent-500 text-white active:bg-accent-600'
            }`}
          >
            +
          </button>
        </div>
      </div>
      {children}
    </div>
  )
}
