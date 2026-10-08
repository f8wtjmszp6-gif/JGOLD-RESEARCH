import { useState } from 'react'
import { workouts, GYM_ORDER, activities, STRETCH_ROUTINE, CARDIO_DEFAULTS, CLASS_AREAS, CARDIO_WORKOUT_MINUTES, cardioIsWorkout, CLASS_STRETCH_WORKOUT_MINUTES, classIsWorkout, STRETCH_WORKOUT_MINUTES } from '../data/workout'
import { SettingsSheet, StepperRow, Segmented, ToggleRow, GearIcon } from './WorkoutDetail'
import pushImg from '../assets/workouts/push.svg'
import legsQuadImg from '../assets/workouts/legsQuad.svg'
import pullImg from '../assets/workouts/pull.svg'
import legsPostImg from '../assets/workouts/legsPost.svg'
import classImg from '../assets/workouts/class.svg'
import walkImg from '../assets/workouts/walk.svg'
import restImg from '../assets/workouts/rest.svg'
import stretchImg from '../assets/workouts/stretch.svg'
import runImg from '../assets/workouts/run.svg'

// A body map per workout: the muscles it trains, lit in orange. Back & Biceps and
// Hamstrings & Calves are drawn from behind (spine and shoulder blades) so they
// read differently from Chest & Shoulders and Quads & Glutes.
const workoutImages = {
  push: pushImg,
  legsQuad: legsQuadImg,
  pull: pullImg,
  legsPost: legsPostImg,
}

// Same figure, posed: arms up for a class, mid-stride for a walk, lying down
// for rest — each in its week-bar color.
const activityImages = {
  class: classImg,
  walk: walkImg,
  rest: restImg,
}

export default function Home({ store, onOpenWorkout }) {
  // Which sheet is open: logging a class, the walk's settings, or adding other cardio.
  const [sheet, setSheet] = useState(null)
  const byId = id => activities.find(a => a.id === id)
  const activityCard = a => {
    const count = store.getActivityCount(a.id)
    const cardio = CARDIO_DEFAULTS[a.id] && store.getCardioSetting(a.id)
    return (
      <ActivityCard
        key={a.id}
        activity={a}
        image={activityImages[a.id]}
        count={count}
        // A walk shows its length: "30 min · Easy", then "2 walks · 60 min".
        detail={cardio && (count
          ? `${count} ${count === 1 ? a.one : a.many} · ${store.getCardioMinutes(a.id)} min`
          : `${cardio.minutes} min · ${cardio.hard ? 'Hard' : 'Easy'}`)}
        onSettings={cardio && (() => setSheet(a.id))}
        onAdd={() => store.addActivity(a.id)}
        onRemove={() => store.removeActivity(a.id)}
      />
    )
  }
  const other = store.otherCardio
  const otherMinutes = store.getCardioMinutes('other')

  return (
    <div className="h-full overflow-y-auto px-5 pb-6">
      <Section title="Workout plans">
        {GYM_ORDER.map(id => (
          <WorkoutCard
            key={id}
            workout={workouts[id]}
            progress={store.workoutProgress(id)}
            onOpen={() => onOpenWorkout(id)}
          />
        ))}
      </Section>

      <Section title="Gym class">
        <ClassCard store={store} activity={byId('class')} onAdd={() => setSheet('class')} />
      </Section>

      <Section title="Cardio and rest">
        {activityCard(byId('walk'))}
        <ActivityCard
          activity={OTHER_CARDIO}
          image={runImg}
          count={other.length}
          detail={other.length ? `${other.length} ${other.length === 1 ? 'session' : 'sessions'} · ${otherMinutes} min` : undefined}
          onAdd={() => setSheet('other')}
          onRemove={store.removeOtherCardio}
        >
          {other.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1.5">
              {other.map((x, i) => <CardioLine key={i} session={x} />)}
            </div>
          )}
        </ActivityCard>
        {activityCard(byId('rest'))}
      </Section>

      <Section title="Stretching">
        <RoutineCard store={store} onOpen={() => onOpenWorkout(STRETCH_ROUTINE.id)} />
        <ActivityCard
          activity={OWN_STRETCH}
          image={stretchImg}
          count={store.ownStretches.length}
          detail={store.ownStretches.length ? ownDetail(store.ownStretches) : undefined}
          onAdd={() => setSheet('stretch')}
          onRemove={store.removeOwnStretch}
        >
          {store.ownStretches.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1.5">
              {store.ownStretches.map((x, i) => <StretchLine key={i} session={x} />)}
            </div>
          )}
        </ActivityCard>
      </Section>

      {sheet === 'other' && <AddCardioSheet store={store} onClose={() => setSheet(null)} />}
      {sheet === 'stretch' && <AddStretchSheet store={store} onClose={() => setSheet(null)} />}
      {sheet === 'class' && <LogClassSheet store={store} onClose={() => setSheet(null)} />}
      {sheet === 'walk' && (
        <CardioSettingsSheet kind="walk" activity={byId('walk')} store={store} onClose={() => setSheet(null)} />
      )}
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
function ClassCard({ store, activity, onAdd }) {
  const classes = store.classes
  const n = classes.length
  return (
    <ActivityCard
      activity={activity}
      image={activityImages.class}
      count={n}
      detail={n ? `${n} ${n === 1 ? activity.one : activity.many} · ${store.getCardioMinutes('class')} min` : undefined}
      onAdd={onAdd}
      onRemove={() => store.removeActivity('class')}
    >
      {n > 0 && (
        <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1.5">
          {classes.map((c, i) => <ClassLine key={i} entry={c} />)}
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

// One class: its day, then a tag for each thing it was.
function ClassLine({ entry }) {
  const day = entry.at ? new Date(entry.at).toLocaleDateString('en-US', { weekday: 'short' }) : 'Earlier'
  const strength = entry.strength && entry.areas.length > 0
  return (
    <div className="flex items-center gap-1.5 flex-wrap text-sm">
      <span className="w-12 font-semibold text-stone-600">{day}</span>
      {entry.cardio && <span className={`${TAG} bg-emerald-50 text-emerald-700`}>{entry.minutes} min {entry.hard ? 'hard' : 'easy'}</span>}
      {strength && <span className={`${TAG} bg-orange-50 text-orange-700`}>{areasLabel(entry.areas)}</span>}
      {entry.stretch && <span className={`${TAG} bg-teal-50 text-teal-700`}>Stretch{entry.stretchMinutes ? ` ${entry.stretchMinutes} min` : ''}</span>}
      {!classIsWorkout(entry) && <span className="text-xs text-stone-400">Not a workout</span>}
    </div>
  )
}

// One other-cardio session: its day, length and effort, and whether it was
// long enough to count as a workout.
function CardioLine({ session }) {
  const day = session.at ? new Date(session.at).toLocaleDateString('en-US', { weekday: 'short' }) : 'Earlier'
  return (
    <div className="flex items-center gap-1.5 flex-wrap text-sm">
      <span className="w-12 font-semibold text-stone-600">{day}</span>
      <span className={`${TAG} bg-emerald-50 text-emerald-700`}>{session.minutes} min {session.hard ? 'hard' : 'easy'}</span>
      {cardioIsWorkout(session) && <span className={`${TAG} bg-cyan-50 text-cyan-700`}>Workout</span>}
    </div>
  )
}

// What you did in a class: cardio (how long, how hard), strength (which
// areas) and stretching. Everything starts off; cardio remembers your last
// length and effort.
function LogClassSheet({ store, onClose }) {
  const [c, setC] = useState(store.getNewClass)
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
    store.logClass({ ...c, strength: c.strength && c.areas.length > 0, areas: c.strength ? c.areas : [] })
    onClose()
  }

  const counts = c.cardio ? `${c.minutes * (c.hard ? 2 : 1)} cardio min` : workout ? 'counts as a workout' : c.stretch ? 'stretch day only' : ''
  const chip = on => `px-3 py-1.5 rounded-xl text-sm font-semibold border-[1.5px] transition-colors ${
    on ? 'bg-orange-50 text-orange-700 border-orange-300' : 'bg-stone-100 text-stone-500 border-transparent'
  }`

  return (
    <SettingsSheet title="Log a class" closeLabel="Cancel" onClose={onClose}>
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
      <button
        onClick={log}
        disabled={nothing}
        className="w-full py-3.5 rounded-2xl bg-accent-500 text-white font-semibold active:bg-accent-600 transition-colors disabled:bg-stone-200 disabled:text-stone-400"
      >
        {nothing ? 'Turn on what you did' : `Log class${counts && ` · ${counts}`}`}
      </button>
    </SettingsSheet>
  )
}

// How long a walk is, and how hard. Applies to the next one you log.
function CardioSettingsSheet({ kind, activity, store, onClose }) {
  const { minutes, hard } = store.getCardioSetting(kind)
  return (
    <SettingsSheet title={activity.name} onClose={onClose}>
      <StepperRow
        label="Length"
        value={minutes}
        step={5}
        min={5}
        max={240}
        editable
        suffix=" min"
        onChange={v => store.setCardioSetting(kind, { minutes: v })}
      />
      <Segmented
        label="Effort"
        value={hard ? 'hard' : 'easy'}
        options={EFFORT}
        onChange={v => store.setCardioSetting(kind, { hard: v === 'hard' })}
      />
      <EffortNote />
    </SettingsSheet>
  )
}

// Logs one session of other cardio. Starts from the last one you added.
function AddCardioSheet({ store, onClose }) {
  const last = store.getCardioSetting('other')
  const [minutes, setMinutes] = useState(last.minutes)
  const [hard, setHard] = useState(last.hard)

  const workout = cardioIsWorkout({ minutes, hard })
  const need = CARDIO_WORKOUT_MINUTES[hard ? 'hard' : 'easy'] - minutes

  function add() {
    store.addOtherCardio(minutes, hard)
    store.setCardioSetting('other', { minutes, hard })
    onClose()
  }

  return (
    <SettingsSheet title="Add cardio" closeLabel="Cancel" onClose={onClose}>
      <StepperRow label="Length" value={minutes} step={5} min={5} max={240} editable suffix=" min" onChange={setMinutes} />
      <Segmented label="Effort" value={hard ? 'hard' : 'easy'} options={EFFORT} onChange={v => setHard(v === 'hard')} />
      {/* 30 min hard or 45 easy makes it a workout, not just cardio minutes. */}
      {workout ? (
        <p className="text-sm font-semibold text-emerald-700">✓ Counts as a workout</p>
      ) : (
        <p className="text-sm text-stone-500">
          {need} more {need === 1 ? 'minute' : 'minutes'} to count as a workout
          <span className="text-stone-400"> ({CARDIO_WORKOUT_MINUTES.hard} hard or {CARDIO_WORKOUT_MINUTES.easy} easy)</span>
        </p>
      )}
      <EffortNote />
      <button
        onClick={add}
        className="w-full py-3.5 rounded-2xl bg-accent-500 text-white font-semibold active:bg-accent-600 transition-colors"
      >
        Add {minutes} min · {workout ? 'counts as a workout' : `${minutes * (hard ? 2 : 1)} cardio min`}
      </button>
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
function StretchLine({ session }) {
  const day = session.at ? new Date(session.at).toLocaleDateString('en-US', { weekday: 'short' }) : 'Earlier'
  return (
    <div className="flex items-center gap-1.5 flex-wrap text-sm">
      <span className="w-12 font-semibold text-stone-600">{day}</span>
      {session.minutes !== null && <span className={`${TAG} bg-teal-50 text-teal-700`}>{session.minutes} min</span>}
      {session.minutes >= STRETCH_WORKOUT_MINUTES && <span className={`${TAG} bg-pink-50 text-pink-700`}>Workout</span>}
    </div>
  )
}

// Logs a stretch session on your own; 30+ minutes also counts as a workout.
function AddStretchSheet({ store, onClose }) {
  const [minutes, setMinutes] = useState(store.lastOwnStretch)
  const need = STRETCH_WORKOUT_MINUTES - minutes
  return (
    <SettingsSheet title="Add stretching" closeLabel="Cancel" onClose={onClose}>
      <StepperRow label="Length" value={minutes} step={5} min={5} max={240} editable suffix=" min" onChange={setMinutes} />
      {need > 0 ? (
        <p className="text-sm text-stone-500">
          {need} more {need === 1 ? 'minute' : 'minutes'} to count as a workout
          <span className="text-stone-400"> (stretching needs {STRETCH_WORKOUT_MINUTES})</span>
        </p>
      ) : (
        <p className="text-sm font-semibold text-emerald-700">✓ Counts as a workout</p>
      )}
      <button
        onClick={() => { store.addOwnStretch(minutes); onClose() }}
        className="w-full py-3.5 rounded-2xl bg-accent-500 text-white font-semibold active:bg-accent-600 transition-colors"
      >
        Add {minutes} min · {need > 0 ? 'stretch day' : 'counts as a workout'}
      </button>
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
            <img src={stretchImg} alt="" className="w-10 h-[50px]" draggable={false} />
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

// Days stretched this week: finishing a gym workout's stretches, the
// full-body routine, or stretching on your own (+) each count once.
function WorkoutCard({ workout, progress, onOpen }) {
  const { done, total } = progress
  const complete = total > 0 && done === total

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl px-4 py-3.5 bg-white shadow-sm transition-all active:scale-[0.98]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center shrink-0">
            <img src={workoutImages[workout.id]} alt="" className="w-10 h-[50px]" draggable={false} />
          </div>
          <div className="min-w-0">
          <p className="font-semibold text-stone-900">
            {workout.short}
            {complete && <span className="text-emerald-600 ml-1.5">✓</span>}
          </p>
          <p className="text-sm text-stone-400 truncate">{workout.name}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-sm font-medium text-stone-500">{done}/{total}</span>
          <div className="w-16 h-1 bg-stone-100 rounded-full mt-1.5">
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

function ActivityCard({ activity, image, count, detail, onSettings, onAdd, onRemove, children }) {
  const active = count > 0

  return (
    <div className="w-full rounded-2xl px-4 py-3.5 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br ${activity.tile} flex items-center justify-center shrink-0`}>
            <img src={image} alt="" className="w-10 h-[50px]" draggable={false} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-stone-900 truncate">{activity.name}</p>
            {/* With settings, the length line is the way in: "45 min · Hard ⚙". */}
            {onSettings ? (
              <button
                onClick={onSettings}
                aria-label={`${activity.name} settings`}
                className="flex items-center gap-1 max-w-full text-sm text-stone-400 active:opacity-60"
              >
                <span className="truncate">{detail}</span>
                <span className="shrink-0 scale-[0.85]"><GearIcon /></span>
              </button>
            ) : (
              <p className="text-sm text-stone-400 truncate">
                {detail ?? (active ? `${count} ${count === 1 ? activity.one : activity.many}` : activity.note)}
              </p>
            )}
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
