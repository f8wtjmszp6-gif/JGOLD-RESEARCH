import { Fragment, useEffect, useRef, useState } from 'react'
import { playBeep, playTick, unlockAudio } from '../utils/sound'
import { useCountdown, useWakeLock, fmtClock } from '../hooks/timing'
import { workouts, STRETCH_ROUTINE, BAR_MIN, BAR_MAX, BAR_STEP, MUSCLE_GROUPS } from '../data/workout'
import { EXERCISE_BANK, EQUIPMENT, SUGGESTED_GROUPS, fitsPlan, isCore, ratingFor, coverage, coversOf, gapsAfter } from '../data/exercises'
import { HOWTO } from '../data/howto'
import { HowToBody } from './HowTo'
import { STRETCH_BANK, STRETCH_AREAS, SUGGESTED_AREAS, stretchFits, stretchRating } from '../data/stretches'

const fmt = n => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100))

// Seconds → "6m 30s" / "6m" / "45s"
function fmtDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (m === 0) return `${s}s`
  if (s === 0) return `${m}m`
  return `${m}m ${s}s`
}

let timerSeq = 0

export default function WorkoutDetail({ workoutId, store, onBack }) {
  // The full-body stretch routine reuses this screen with just its stretches.
  const workout = workouts[workoutId] ?? STRETCH_ROUTINE
  const isRoutine = workout.exercises.length === 0
  const [tab, setTab] = useState(isRoutine ? 'stretches' : 'exercises')
  const [showWorkoutSettings, setShowWorkoutSettings] = useState(false)
  const [editingStretches, setEditingStretches] = useState(false)
  const warmup = store.getWarmup(workoutId)
  // One exercise is open at a time: the one you tapped, else the first one
  // not finished. Finishing it moves on to the next.
  const [openId, setOpenId] = useState(null)
  const exercises = store.getExercises(workoutId)
  const unfinished = exercises.find(x => !store.getLog(workoutId, x).sets.every(set => set.done))
  const openExercise = exercises.some(x => x.id === openId) ? openId : unfinished?.id

  // The one timer on screen, shown in the bar at the bottom.
  //   kind  – 'rest' | 'hold' | 'stretch'
  //   side / sides – per-side holds and stretches run twice
  //   phase – 'running' | 'switch' (between sides) | 'over'
  const [active, setActive] = useState(null)
  const clock = useCountdown(({ start }) => {
    playBeep()
    const a = active
    if (!a) return

    // A rest between stretch sets ends by waiting for Start, like a side switch.
    if (a.phase === 'rest') {
      setActive({ ...a, phase: 'switch' })
      return
    }
    // Between sides it waits for you to reposition and tap Start.
    if (a.side < a.sides) {
      setActive({ ...a, phase: 'switch' })
      return
    }
    // Between sets: rest first (if set), then wait for Start.
    if (a.set < a.sets) {
      if (a.rest > 0) {
        setActive({ ...a, phase: 'rest', restTotal: a.rest * 1000 })
        start(a.rest * 1000)
      } else {
        setActive({ ...a, phase: 'switch' })
      }
      return
    }

    if (a.kind === 'hold') {
      const sets = store.getLog(workoutId, a.exercise).sets
      if (!sets[a.index]?.done) store.toggleSet(workoutId, a.exercise, a.index)
      const left = sets.filter((x, i) => !x.done && i !== a.index).length
      if (startRest(a.exercise, left)) return // rolls straight into rest
    }
    if (a.kind === 'warmup') store.setWarmupDone(workoutId, true)
    if (a.kind === 'stretch' && !store.getStretchDone(workoutId, a.stretchId)) {
      store.toggleStretch(workoutId, a.stretchId)
    }

    setActive({ ...a, phase: 'over' })
    // Rest waits for you to dismiss it; a finished hold or stretch clears itself.
    if (a.kind !== 'rest') setTimeout(() => setActive(x => (x?.id === a.id ? null : x)), 1600)
  })
  useWakeLock(clock.running)

  // 3-2-1 ticks so you hear the end coming.
  const secondsLeft = Math.ceil(clock.remaining / 1000)
  const lastTick = useRef(null)
  useEffect(() => {
    if (!clock.running || secondsLeft > 3 || secondsLeft < 1 || lastTick.current === secondsLeft) return
    lastTick.current = secondsLeft
    playTick()
  }, [clock.running, secondsLeft])
  useEffect(() => { if (secondsLeft > 3) lastTick.current = null }, [secondsLeft])

  function run(timer) {
    unlockAudio()
    setActive({ id: ++timerSeq, side: 1, sides: 1, set: 1, sets: 1, phase: 'running', ...timer })
    clock.start(timer.total)
  }

  // Starts the exercise's rest, if it has one turned on and a set is still
  // left — no rest after the last set. Returns whether it did.
  function startRest(exercise, setsLeft) {
    const setup = store.getSetup(exercise)
    if (setsLeft === 0) {
      // Finished early, mid-rest: that rest no longer applies.
      if (active?.kind === 'rest' && active.exercise?.id === exercise.id) stopTimer()
      return false
    }
    if (!setup.restOn) return false
    run({ kind: 'rest', title: exercise.name, total: setup.rest * 1000, exercise })
    return true
  }

  // Times the next hold you haven't ticked off yet, from that set's seconds.
  function startHold(exercise) {
    const sets = store.getLog(workoutId, exercise).sets
    const index = Math.max(0, sets.findIndex(x => !x.done))
    run({
      kind: 'hold',
      title: exercise.name,
      total: sets[index].reps * 1000,
      sides: store.getSetup(exercise).perSide ? 2 : 1,
      exercise,
      index,
    })
  }

  function startWarmup() {
    run({ kind: 'warmup', title: `${warmup.minutes} min`, total: warmup.minutes * 60000 })
  }

  function startStretch(stretch) {
    run({
      kind: 'stretch',
      title: stretch.name,
      total: stretch.duration * 1000,
      sides: stretch.perSide ? 2 : 1,
      sets: stretch.sets,
      rest: stretch.rest,
      stretchId: stretch.id,
    })
  }

  function stopTimer() {
    clock.stop()
    setActive(null)
  }

  // "Start" between rounds: the next side, or side 1 of the next set.
  function startNextSide() {
    unlockAudio()
    setActive(a => (a.side < a.sides
      ? { ...a, side: a.side + 1, phase: 'running' }
      : { ...a, set: a.set + 1, side: 1, phase: 'running' }))
    clock.start(active.total)
  }

  // "Start" after a rest: a hold begins its next countdown; for reps it just
  // clears the bar so you can lift.
  function startNextSet() {
    const exercise = active?.exercise
    if (exercise && store.getSetup(exercise).mode === 'hold') startHold(exercise)
    else stopTimer()
  }

  // What comes after a rest, read live so ticking during the rest updates it.
  let next = null
  if (active?.kind === 'rest' && active.exercise) {
    const sets = store.getLog(workoutId, active.exercise).sets
    const index = sets.findIndex(x => !x.done)
    next = { complete: index === -1, set: index + 1, of: sets.length }
  }

  const exerciseList = store.getExercises(workoutId)
  const exerciseDone = exerciseList.filter(e => store.getLog(workoutId, e).sets.every(x => x.done)).length
  const stretchList = store.getStretches(workout.id)
  const showingStretches = isRoutine || tab === 'stretches'
  const stretchDone = stretchList.filter(s => store.getStretchDone(workoutId, s.id)).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 bg-stone-50 shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-accent-500 mb-4 active:opacity-70">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="text-sm font-medium">Workouts</span>
        </button>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">{workout.short}</h1>
          {/* The gear edits what you're looking at: on Exercises, the workout's
              settings (warm-up, exercises); on Stretches — and the Full-Body
              Stretch — its list of stretches. */}
          <button
            onClick={() => (showingStretches ? setEditingStretches(true) : setShowWorkoutSettings(true))}
            aria-label={showingStretches ? (isRoutine ? 'Edit stretches' : `Edit ${workout.short} stretches`) : `${workout.short} settings`}
            className="w-10 h-10 rounded-xl bg-white shadow-sm text-stone-500 flex items-center justify-center active:bg-stone-100 transition-colors shrink-0"
          >
            <GearIcon />
          </button>
        </div>
        <p className="text-stone-400 text-sm mt-1">{isRoutine ? 'For days without a gym workout' : workout.name}</p>
      </div>

      {/* Tabs */}
      {!isRoutine && <div className="px-5 mb-3 bg-stone-50 shrink-0">
        <div className="bg-stone-100 rounded-xl p-1 flex">
          <TabBtn active={tab === 'exercises'} onClick={() => setTab('exercises')}>
            Exercises {exerciseDone > 0 && <span className="ml-1 text-accent-500">({exerciseDone}/{exerciseList.length})</span>}
          </TabBtn>
          <TabBtn active={tab === 'stretches'} onClick={() => setTab('stretches')}>
            Stretches {stretchDone > 0 && <span className="ml-1 text-accent-500">({stretchDone}/{stretchList.length})</span>}
          </TabBtn>
        </div>
      </div>}

      {/* Content */}
      <div className={`flex-1 overflow-y-auto px-5 space-y-2 ${active ? 'pb-28' : 'pb-6'}`}>
        {tab === 'exercises' && warmup.on && (
          <WarmupCard
            minutes={warmup.minutes}
            done={store.getWarmupDone(workoutId)}
            onStart={startWarmup}
            onToggle={() => store.setWarmupDone(workoutId, !store.getWarmupDone(workoutId))}
          />
        )}

        {tab === 'exercises' && exercises.map((exercise, i, list) => (
          <Fragment key={exercise.id}>
          {/* The Core section starts at the first core exercise. */}
          {isCore(exercise) && !isCore(list[i - 1] ?? {}) && (
            <p className="text-xs text-stone-400 uppercase tracking-wider font-medium px-1 pt-2">Core</p>
          )}
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            workoutId={workoutId}
            store={store}
            open={exercise.id === openExercise}
            onOpen={() => setOpenId(exercise.id)}
            onClose={() => setOpenId(null)}
            onSetDone={setsLeft => {
              startRest(exercise, setsLeft)
              if (setsLeft === 0) setOpenId(null)
            }}
            onTimer={store.getSetup(exercise).mode === 'hold' ? () => startHold(exercise) : null}
          />
          </Fragment>
        ))}

        {tab === 'stretches' && (
          <StretchesTab workout={workout} store={store} onTimer={startStretch} editing={editingStretches} onEditingChange={setEditingStretches} />
        )}
      </div>

      {showWorkoutSettings && (
        <SettingsSheet title={`${workout.short} settings`} onClose={() => setShowWorkoutSettings(false)}>
          {/* The plan's optional parts first: Core, then the warm-up. */}
          <SheetSection title="Add to this workout">
            <ToggleRow
              label="Core"
              detail="A core section at the end of the workout"
              on={store.getExerciseSections(workoutId).coreOn}
              onChange={v => store.setCoreOn(workoutId, v)}
            />
            <ToggleRow
              label="Warm-up"
              detail="A timed warm-up at the top of the workout"
              on={warmup.on}
              onChange={on => store.setWarmup(workoutId, { on })}
            />
            {warmup.on && (
              <StepperRow
                label="Length"
                value={warmup.minutes}
                step={1}
                min={1}
                max={30}
                editable
                suffix=" min"
                onChange={minutes => store.setWarmup(workoutId, { minutes })}
              />
            )}
          </SheetSection>
          <SheetSection title="Exercises">
            <ExerciseOrder workoutId={workoutId} store={store} />
          </SheetSection>
        </SettingsSheet>
      )}

      {active && (
        <TimerBar
          timer={active}
          next={next}
          remaining={clock.remaining}
          running={clock.running}
          onPause={clock.pause}
          onResume={() => { unlockAudio(); clock.resume() }}
          onAdd={() => {
            clock.add(30000)
            setActive(a => (a.phase === 'rest' ? { ...a, restTotal: a.restTotal + 30000 } : { ...a, total: a.total + 30000 }))
          }}
          onSkipRest={() => { clock.stop(); setActive(a => ({ ...a, phase: 'switch' })) }}
          onClose={stopTimer}
          onStart={active.phase === 'switch' ? startNextSide : startNextSet}
        />
      )}
    </div>
  )
}

// Every timer — rest, hold, stretch — lives in this bar pinned to the bottom,
// so the list stays in view while it runs.
const TIMER_LABELS = { rest: 'Rest', hold: 'Hold', stretch: 'Stretch', warmup: 'Warm-up' }

// The bar's color says what's happening: blue while you work, amber while
// you rest, white when it's waiting for your tap, green when you're done.
const BAR_THEMES = {
  work: {
    bar: 'bg-blue-50 border-blue-200', label: 'text-blue-900/70', big: 'text-blue-900',
    track: 'bg-blue-100', fill: 'bg-blue-600',
    primary: 'bg-blue-600 text-white active:bg-blue-700', secondary: 'bg-blue-100 text-blue-900 active:bg-blue-200',
  },
  rest: {
    bar: 'bg-amber-50 border-amber-300', label: 'text-amber-900/70', big: 'text-amber-900',
    track: 'bg-amber-100', fill: 'bg-amber-600',
    primary: 'bg-amber-600 text-white active:bg-amber-700', secondary: 'bg-amber-100 text-amber-900 active:bg-amber-200',
  },
  waiting: {
    bar: 'bg-white border-stone-200', label: 'text-stone-500', big: 'text-stone-900',
    track: 'bg-stone-100', fill: 'bg-stone-900',
    primary: 'bg-stone-900 text-white active:bg-stone-700', secondary: 'bg-stone-100 text-stone-700 active:bg-stone-200',
  },
  done: {
    bar: 'bg-emerald-50 border-emerald-200', label: 'text-emerald-900/70', big: 'text-emerald-900',
    track: 'bg-emerald-100', fill: 'bg-emerald-600',
    primary: 'bg-emerald-600 text-white active:bg-emerald-700', secondary: 'bg-emerald-100 text-emerald-900 active:bg-emerald-200',
  },
}

function TimerBar({ timer, next, remaining, running, onPause, onResume, onAdd, onClose, onStart, onSkipRest }) {
  const over = timer.phase === 'over'
  const switching = timer.phase === 'switch'
  const setRest = timer.phase === 'rest' // resting between stretch sets
  const resting = timer.kind === 'rest' || setRest
  const progress = over || switching ? 1 : 1 - remaining / (setRest ? timer.restTotal : timer.total)
  const sides = (timer.sets > 1 ? ` · Set ${timer.set} of ${timer.sets}` : '') +
    (timer.sides > 1 ? ` · Side ${timer.side} of ${timer.sides}` : '')

  let big = fmtClock(remaining)
  let label = `${TIMER_LABELS[timer.kind]} · ${timer.title}${sides}`
  if (next && !next.complete) label += ` · Next: set ${next.set} of ${next.of}`
  if (setRest) label = `Rest · ${timer.title} · Set ${timer.set + 1} of ${timer.sets} next`
  if (switching && timer.side < timer.sides) {
    big = 'Switch sides'
    label = `${timer.title} · Side ${timer.side + 1} next${timer.sets > 1 ? ` · set ${timer.set} of ${timer.sets}` : ''}`
  } else if (switching) {
    big = 'Next set'
    label = `${timer.title} · Set ${timer.set + 1} of ${timer.sets} next`
  }
  if (over) {
    if (timer.kind !== 'rest') {
      big = 'Done ✓'
      label = timer.title
    } else if (next?.complete) {
      big = 'All sets done ✓'
      label = `${timer.title} complete — on to the next exercise`
    } else {
      big = 'Next set'
      label = next ? `Set ${next.set} of ${next.of} · ${timer.title}` : timer.title
    }
  }

  const waiting = switching || (over && timer.kind === 'rest' && next && !next.complete)
  const theme = BAR_THEMES[waiting ? 'waiting' : over ? 'done' : resting ? 'rest' : 'work']

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-40 px-4"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <div className={`max-w-md mx-auto rounded-2xl border shadow-lg px-4 py-3 transition-colors duration-300 ${theme.bar}`}>
        <div className="flex items-center gap-2.5">
          <div className="flex-1 min-w-0">
            <p className={`text-xs truncate ${theme.label}`}>{label}</p>
            <p className={`text-2xl font-bold ${theme.big}`}>{big}</p>
          </div>
          {!over && !switching && (resting ? (
            <BarBtn className={theme.secondary} onClick={onAdd}>+30s</BarBtn>
          ) : (
            <BarBtn className={theme.secondary} onClick={running ? onPause : onResume}>{running ? 'Pause' : 'Resume'}</BarBtn>
          ))}
          {waiting ? (
            <>
              {switching && <BarBtn className={theme.secondary} onClick={onClose}>Stop</BarBtn>}
              <BarBtn className={theme.primary} onClick={onStart}>Start</BarBtn>
            </>
          ) : (
            <BarBtn className={theme.primary} onClick={setRest ? onSkipRest : onClose}>
              {over ? 'Done' : resting ? 'Skip' : 'Stop'}
            </BarBtn>
          )}
        </div>
        <div className={`h-1 rounded-full mt-2.5 overflow-hidden ${theme.track}`}>
          <div className={`h-full rounded-full ${theme.fill}`} style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </div>
  )
}

function BarBtn({ className, onClick, children }) {
  return (
    <button onClick={onClick} className={`px-3 h-10 rounded-xl text-sm font-semibold transition-colors ${className}`}>
      {children}
    </button>
  )
}

// `editing` (the header gear) opens the edit sheet.
function StretchesTab({ workout, store, onTimer, editing, onEditingChange: setEditing }) {
  const list = store.getStretches(workout.id)
  const [adding, setAdding] = useState(false)
  const totalStretchSeconds = list.reduce(
    (sum, s) => {
      const sets = store.getStretchSets(s.id)
      const hold = store.getCustomDuration(s.id, s.duration) * (store.getPerSide(s.id, s.perSide) ? 2 : 1)
      return sum + hold * sets + store.getStretchRest(s.id) * (sets - 1)
    },
    0,
  )

  return (
    <>
      <div className="rounded-2xl bg-accent-50 border border-accent-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ClockIcon size={18} />
          <span className="text-sm font-medium text-stone-600">Total stretching time</span>
        </div>
        <span className="text-accent-600 font-bold">{fmtDuration(totalStretchSeconds)}</span>
      </div>

      {list.map(stretch => (
        <StretchCard
          key={stretch.id}
          stretch={stretch}
          checked={store.getStretchDone(workout.id, stretch.id)}
          onToggle={() => store.toggleStretch(workout.id, stretch.id)}
          customDuration={store.getCustomDuration(stretch.id, stretch.duration)}
          onDurationChange={s => store.setCustomDuration(stretch.id, s)}
          perSide={store.getPerSide(stretch.id, stretch.perSide)}
          onPerSideChange={v => store.setPerSide(stretch.id, v)}
          sets={store.getStretchSets(stretch.id)}
          onSetsChange={n => store.setStretchSets(stretch.id, n)}
          rest={store.getStretchRest(stretch.id)}
          onRestChange={n => store.setStretchRest(stretch.id, n)}
          onTimer={() => onTimer({
            ...stretch,
            duration: store.getCustomDuration(stretch.id, stretch.duration),
            perSide: store.getPerSide(stretch.id, stretch.perSide),
            sets: store.getStretchSets(stretch.id),
            rest: store.getStretchRest(stretch.id),
          })}
        />
      ))}

      {editing && !adding && (
        <SettingsSheet title="Edit stretches" onClose={() => setEditing(false)}>
          <StretchListEditor listId={workout.id} store={store} onAdd={() => setAdding(true)} />
        </SettingsSheet>
      )}
      {adding && (
        <StretchPicker
          listId={workout.id}
          store={store}
          onPick={id => {
            store.addStretch(workout.id, id)
            setAdding(false)
          }}
          onClose={() => setAdding(false)}
        />
      )}
    </>
  )
}

// A list's stretches with ↑ / ↓ to reorder and ✕ to remove (never the last).
function StretchListEditor({ listId, store, onAdd }) {
  const list = store.getStretches(listId)
  const icon = (d, disabled, onClick, label) => (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-9 h-9 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center active:bg-stone-200 disabled:opacity-30"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </svg>
    </button>
  )
  return (
    <>
      <div className="space-y-1.5">
        {list.map((x, i) => (
          <div key={x.id} className="flex items-center gap-1.5 rounded-xl bg-stone-50 pl-3 pr-1.5 py-1.5">
            <span className="text-xs font-semibold text-stone-400 w-4 shrink-0">{i + 1}</span>
            <span className="flex-1 min-w-0 truncate text-sm text-stone-700">{x.name}</span>
            {icon('M18 15l-6-6-6 6', i === 0, () => store.moveStretch(listId, x.id, -1), `Move ${x.name} up`)}
            {icon('M6 9l6 6 6-6', i === list.length - 1, () => store.moveStretch(listId, x.id, 1), `Move ${x.name} down`)}
            {icon('M6 6l12 12M18 6L6 18', list.length <= 1, () => store.removeStretch(listId, x.id), `Remove ${x.name}`)}
          </div>
        ))}
      </div>
      <button
        onClick={onAdd}
        className="w-full py-3 rounded-xl bg-accent-500 text-white text-sm font-semibold active:bg-accent-600 transition-colors"
      >
        + Add stretch
      </button>
    </>
  )
}

// The stretches that fit the list and aren't in it yet, by body area, best
// first, starting with the areas this workout works.
function StretchPicker({ listId, store, onPick, onClose }) {
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
function ExercisePicker({ workoutId, store, section, onPick, onClose }) {
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

// A yes/no question in a sheet: Cancel, or do it anyway.
function ConfirmSheet({ title, body, confirmLabel, onConfirm, onClose }) {
  return (
    <SettingsSheet title={title} closeLabel="Cancel" onClose={onClose}>
      <p className="text-sm text-stone-600 leading-relaxed">{body}</p>
      <button
        onClick={onConfirm}
        className="w-full py-3 rounded-2xl bg-orange-50 text-orange-700 text-sm font-semibold active:bg-orange-100 transition-colors"
      >
        {confirmLabel}
      </button>
    </SettingsSheet>
  )
}

// Which of a list's areas are covered: "Chest ✓ · Side delts — missing".
function CoverageRow({ list, area }) {
  const areas = coverage(list, area)
  if (!areas.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-stone-500 font-medium">Covers:</span>
      {areas.map(a => (
        <span
          key={a.id}
          className={`px-2 py-0.5 rounded-md font-semibold ${a.covered ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}
        >
          {a.label} {a.covered ? '✓' : '— missing'}
        </span>
      ))}
    </div>
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
    <SettingsSheet title={title} closeLabel="Cancel" onClose={onClose}>
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

// A plan's exercises: ↑ / ↓ to reorder (steadier than dragging mid-set), ✕ to
// remove, and + to add from the exercise bank — only exercises that fit the
// plan. Below, the Core section's own list while Core is on.
function ExerciseOrder({ workoutId, store }) {
  const { main, core, coreOn } = store.getExerciseSections(workoutId)
  const [adding, setAdding] = useState(null) // 'main' | 'core'
  const [removing, setRemoving] = useState(null) // { ex, gaps } waiting on "remove anyway"

  // Removing the only exercise for an area asks first.
  function remove(ex) {
    const list = isCore(ex) ? core : main
    const gaps = gapsAfter(list, list.filter(x => x.id !== ex.id), isCore(ex) ? 'core' : workoutId)
    if (gaps.length) setRemoving({ ex, gaps })
    else store.removeExercise(workoutId, ex.id)
  }
  const icon = (d, disabled, onClick, label) => (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-9 h-9 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center active:bg-stone-200 disabled:opacity-30"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </svg>
    </button>
  )
  const rows = (list, minOne) => (
    <div className="space-y-1.5">
      {list.map((ex, i) => (
        <div key={ex.id} className="flex items-center gap-1.5 rounded-xl bg-stone-50 pl-3 pr-1.5 py-1.5">
          <span className="text-xs font-semibold text-stone-400 w-4 shrink-0">{i + 1}</span>
          <span className="flex-1 min-w-0 truncate text-sm text-stone-700">{ex.name}</span>
          {icon('M18 15l-6-6-6 6', i === 0, () => store.moveExercise(workoutId, ex.id, -1), `Move ${ex.name} up`)}
          {icon('M6 9l6 6 6-6', i === list.length - 1, () => store.moveExercise(workoutId, ex.id, 1), `Move ${ex.name} down`)}
          {icon('M6 6l12 12M18 6L6 18', minOne && list.length <= 1, () => remove(ex), `Remove ${ex.name}`)}
        </div>
      ))}
    </div>
  )
  const addBtn = (label, section) => (
    <button
      onClick={() => setAdding(section)}
      className="w-full py-3 rounded-xl bg-accent-500 text-white text-sm font-semibold active:bg-accent-600 transition-colors"
    >
      {label}
    </button>
  )
  return (
    <>
      <CoverageRow list={main} area={workoutId} />
      {rows(main, true)}
      {addBtn('+ Add exercise', 'main')}
      {/* The Core section's own list, while Core is on (switch at the top). */}
      {coreOn && (
        <div className="pt-4 border-t border-stone-100 space-y-3">
          <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">Core</p>
          <CoverageRow list={core} area="core" />
          {core.length > 0 ? rows(core, false) : <p className="text-sm text-stone-400">No core exercises yet.</p>}
          {addBtn('+ Add core exercise', 'core')}
        </div>
      )}
      {removing && (
        <ConfirmSheet
          title={`Leave ${removing.gaps.join(' and ')} uncovered?`}
          body={`${removing.ex.name} is the only exercise here for ${removing.gaps.join(' and ')}.`}
          confirmLabel="Remove anyway"
          onConfirm={() => { store.removeExercise(workoutId, removing.ex.id); setRemoving(null) }}
          onClose={() => setRemoving(null)}
        />
      )}
      {adding && (
        <ExercisePicker
          workoutId={workoutId}
          store={store}
          section={adding}
          onPick={id => { store.addExercise(workoutId, id); setAdding(null) }}
          onClose={() => setAdding(null)}
        />
      )}
    </>
  )
}

// Optional timed warm-up, tinted blue so it stands apart from the lifts.
function WarmupCard({ minutes, done, onStart, onToggle }) {
  return (
    <div className="rounded-2xl p-4 bg-accent-50 border border-accent-200 flex items-center gap-3">
      <button onClick={onToggle} className="shrink-0 active:scale-95 transition-transform" aria-label={done ? 'Untick warm-up' : 'Tick warm-up'}>
        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
          done ? 'border-accent-500 bg-accent-500' : 'border-accent-200 bg-white'
        }`}>
          {done && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-accent-600">{done ? 'Warm-up done' : 'Warm-up'}</p>
        <p className="text-sm text-stone-500">{minutes} min · treadmill, bike or rower</p>
      </div>
      {!done && (
        <button onClick={onStart} className="px-4 h-9 rounded-xl bg-accent-500 text-white text-sm font-semibold active:bg-accent-600 shrink-0">
          Start
        </button>
      )}
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
        active ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'
      }`}
    >
      {children}
    </button>
  )
}

export function GearIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function InfoIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9.5" /><path d="M12 11v5.5M12 7.6v.1" strokeWidth="2.4" /></svg>
  )
}

// ⓘ next to an exercise's or stretch's gear: how to do it, in a sheet.
function HowToButton({ item, kind, className }) {
  const [open, setOpen] = useState(false)
  if (!HOWTO[item.id]) return null
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`How to do ${item.name}`}
        className={`${className} rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center active:bg-stone-200 transition-colors`}
      >
        <InfoIcon size={20} />
      </button>
      {open && (
        <SettingsSheet title={item.name} onClose={() => setOpen(false)}>
          <HowToBody item={item} kind={kind} />
        </SettingsSheet>
      )}
    </>
  )
}

function ClockIcon({ size = 16, color = 'var(--color-accent-500)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

// Bottom sheet for an exercise's or stretch's settings — the list underneath
// never moves, and the controls are big enough to hit mid-set.
export function SettingsSheet({ title, closeLabel = 'Done', onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-md px-5 pt-3 max-h-[88dvh] overflow-y-auto"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-stone-200 mx-auto mb-4" />
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-stone-900 font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-accent-500 text-sm font-semibold active:opacity-70">
            {closeLabel}
          </button>
        </div>
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  )
}

// ── A −/+ row used inside the settings menu ──────────────────────────────────
export function StepperRow({ label, value, step, min = 0, max = Infinity, editable, suffix = '', format = fmt, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const clamp = v => Math.min(max, Math.max(min, Math.round(v * 100) / 100))

  function save() {
    setEditing(false)
    const n = parseFloat(draft)
    if (!isNaN(n)) onChange(clamp(n))
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-base text-stone-600">{label}</span>
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => onChange(clamp(value - step))}
          className="w-11 h-11 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600 text-lg font-medium active:bg-stone-200 transition-colors"
        >
          −
        </button>
        {editing ? (
          <input
            type="number"
            inputMode="decimal"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={e => e.key === 'Enter' && save()}
            autoFocus
            className="w-16 text-center text-xl font-bold bg-stone-100 rounded-lg px-1 py-1 text-stone-900 outline-none"
          />
        ) : (
          <button
            onClick={() => { if (editable) { setDraft(String(value)); setEditing(true) } }}
            className={`w-16 text-center text-xl font-bold text-stone-900 ${editable ? 'active:opacity-60' : ''}`}
          >
            {format(value)}{suffix && <span className="text-xs font-medium text-stone-400">{suffix}</span>}
          </button>
        )}
        <button
          onClick={() => onChange(clamp(value + step))}
          className="w-11 h-11 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600 text-lg font-medium active:bg-stone-200 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  )
}

// ── One set: remembered reps (or seconds) plus this round's tick ────────────
function SetRow({ index, value, done, hold, readOnly, onChange, onToggle }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  function save() {
    setEditing(false)
    const n = parseInt(draft)
    if (!isNaN(n) && n >= 0) onChange(n)
  }

  return (
    <div className={`flex items-center gap-2 rounded-xl px-2.5 py-2 transition-colors ${
      done ? 'bg-accent-100/70' : 'bg-stone-50'
    }`}>
      <span className={`text-xs font-semibold w-4 shrink-0 ${done ? 'text-accent-500' : 'text-stone-400'}`}>
        {index + 1}
      </span>

      {readOnly ? (
        <span className="flex-1 text-center">
          <span className="text-base font-bold text-stone-900">{value}</span>
          <span className="text-xs font-medium text-stone-400">s hold</span>
        </span>
      ) : (<>
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-stone-600 font-medium active:bg-stone-100 transition-colors shrink-0"
      >
        −
      </button>

      {editing ? (
        <input
          type="number"
          inputMode="numeric"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={e => e.key === 'Enter' && save()}
          autoFocus
          className="flex-1 min-w-0 text-center text-base font-bold bg-white rounded-lg px-1 py-0.5 text-stone-900 outline-none shadow-sm"
        />
      ) : (
        <button
          onClick={() => { setDraft(String(value)); setEditing(true) }}
          className="flex-1 text-center active:opacity-60"
        >
          <span className="text-base font-bold text-stone-900">{value}</span>
          <span className="text-xs font-medium text-stone-400">{hold ? 's' : ' reps'}</span>
        </button>
      )}

      <button
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-stone-600 font-medium active:bg-stone-100 transition-colors shrink-0"
      >
        +
      </button>
      </>)}

      <button onClick={onToggle} aria-label={`${done ? 'Untick' : 'Tick'} set ${index + 1}`} className="shrink-0 active:scale-95 transition-transform ml-0.5">
        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
          done ? 'border-accent-500 bg-accent-500' : 'border-stone-200 bg-white'
        }`}>
          {done && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      </button>
    </div>
  )
}

// ── Exercise card ────────────────────────────────────────────────────────────
// Open, it's the full card with its sets. Folded, it's one line: finished
// exercises tinted with a tick, the rest with a dot per set. Tap to open.
function ExerciseCard({ exercise, workoutId, store, open, onOpen, onClose, onTimer, onSetDone }) {
  const [showSettings, setShowSettings] = useState(false)

  const log = store.getLog(workoutId, exercise)
  const equipment = store.getEquipment(exercise)
  const assist = equipment === 'assisted'
  const setup = store.getSetup(exercise)
  const hold = setup.mode === 'hold'

  const allDone = log.sets.every(x => x.done)
  const someDone = log.sets.some(x => x.done)

  const holdTime = log.sets[0]?.reps ?? 0
  const summary = loadSummary(equipment, log)

  if (!open && !allDone) {
    return (
      <button
        onClick={onOpen}
        className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 bg-white shadow-sm text-left active:opacity-70"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-stone-900 truncate">{exercise.name}</span>
          <span className={`block text-sm ${assist ? 'text-stone-400' : 'text-stone-600'}`}>{summary}</span>
        </span>
        <span className="flex gap-1 shrink-0" role="img" aria-label={`${log.sets.filter(x => x.done).length} of ${log.sets.length} sets done`}>
          {log.sets.map((x, i) => (
            <span key={i} className={`w-2 h-2 rounded-full ${x.done ? 'bg-accent-500' : 'bg-stone-200'}`} />
          ))}
        </span>
      </button>
    )
  }

  if (!open) {
    const done = hold
      ? `${log.sets.length} × ${log.sets[0]?.reps ?? 0}s`
      : `${log.weight > 0 ? `${fmt(log.weight)} lbs · ` : ''}${log.sets.map(x => x.reps).join(', ')}`
    return (
      <button
        onClick={onOpen}
        className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 bg-accent-50 border border-accent-200 text-left active:opacity-70"
      >
        <span className="w-6 h-6 rounded-full bg-accent-500 flex items-center justify-center shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <span className="font-semibold text-accent-600 truncate">{exercise.name}</span>
        <span className="text-sm text-stone-500 ml-auto shrink-0">{done}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-stone-300 shrink-0"><path d="M9 18l6-6-6-6" /></svg>
      </button>
    )
  }

  return (
    <div className={`rounded-2xl p-4 transition-all ${
      allDone ? 'bg-accent-50 border border-accent-200' : 'bg-white shadow-sm'
    }`}>
      {/* Name + actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`font-semibold leading-tight ${allDone ? 'text-accent-500' : 'text-stone-900'}`}>
            {exercise.name}
            {setup.perSide && <span className="text-stone-400 font-normal text-sm ml-1">(per side)</span>}
          </p>
          <p className={`mt-1 text-sm font-medium ${assist ? 'text-stone-400' : 'text-stone-600'}`}>
            {summary}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <HowToButton item={exercise} kind="exercise" className="w-10 h-10" />
          <button
            onClick={() => setShowSettings(true)}
            aria-label={`${exercise.name} settings`}
            className="w-10 h-10 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center active:bg-stone-200 transition-colors mr-1.5"
          >
            <GearIcon size={20} />
          </button>
          {onTimer && (
            <button
              onClick={onTimer}
              className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center active:bg-accent-200 transition-colors"
            >
              <ClockIcon size={19} />
            </button>
          )}
          <button
            onClick={() => { store.toggleExercise(workoutId, exercise); if (!allDone) onClose() }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors text-xs font-bold ${
              allDone ? 'bg-accent-500 text-white' : 'bg-stone-100 text-stone-400 active:bg-stone-200'
            }`}
            aria-label={allDone ? 'Untick all sets' : 'Tick all sets'}
          >
            {allDone ? '✓' : 'All'}
          </button>
        </div>
      </div>

      {setup.restOn && (
        <span className="inline-block mt-1.5 text-xs font-medium text-accent-600 bg-accent-50 px-1.5 py-0.5 rounded-md">Rest {fmtClock(setup.rest * 1000)}</span>
      )}

      {/* Sets */}
      <div className="mt-2.5 space-y-1.5">
        {log.sets.map((set, i) => (
          <SetRow
            key={i}
            index={i}
            value={set.reps}
            done={set.done}
            hold={hold}
            readOnly={hold}
            onChange={reps => store.setSetReps(exercise, i, reps)}
            onToggle={() => {
              store.toggleSet(workoutId, exercise, i)
              if (!set.done) onSetDone(log.sets.filter((x, j) => !x.done && j !== i).length)
            }}
          />
        ))}
      </div>

      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={() => store.addSet(exercise)}
          className="text-xs font-semibold text-accent-500 active:opacity-60"
        >
          + Add set
        </button>
        {log.sets.length > 1 && (
          <button
            onClick={() => store.removeSet(exercise)}
            className="text-xs font-medium text-stone-400 active:text-stone-600"
          >
            − Remove set
          </button>
        )}
        {allDone && (
          <button onClick={onClose} className="text-xs font-medium text-stone-400 ml-auto active:text-stone-600">
            Collapse
          </button>
        )}
        {someDone && !allDone && (
          <span className="text-xs text-stone-400 ml-auto">
            {log.sets.filter(x => x.done).length}/{log.sets.length} done
          </span>
        )}
      </div>

      {showSettings && (
        <SettingsSheet title={exercise.name} onClose={() => setShowSettings(false)}>
          <EquipmentPicker value={equipment} onChange={v => store.setEquipment(exercise, v)} />
          <LoadHero equipment={equipment} weight={log.weight} bar={log.bar} onChange={v => store.setWeight(exercise, v)} />
          {/* Set-once settings, one row each. */}
          <div className="rounded-2xl bg-stone-50 divide-y divide-stone-200/70 overflow-hidden">
            {equipment === 'barbell' && (
              <div className="px-4 py-2.5">
                <StepperRow
                  label="Bar"
                  value={log.bar}
                  step={BAR_STEP}
                  min={BAR_MIN}
                  max={BAR_MAX}
                  suffix=" lbs"
                  onChange={v => store.setBar(exercise, v)}
                />
              </div>
            )}
            <div className="px-4 py-2.5">
              <Segmented
                label="Counted in"
                value={setup.mode}
                options={[['reps', 'Reps'], ['hold', 'Hold']]}
                onChange={mode => store.setSetup(exercise, { mode })}
              />
            </div>
            {hold && (
              <div className="px-4 py-2.5 space-y-2">
                <StepperRow
                  label="Hold time"
                  value={holdTime}
                  step={5}
                  min={5}
                  editable
                  suffix="s"
                  onChange={v => store.setHoldTime(exercise, v)}
                />
                <p className="text-xs text-stone-400">Tap the clock on the card to time each set — it ticks the set when time’s up.</p>
              </div>
            )}
            <div className="px-4 py-3">
              <ToggleRow
                label="Per side"
                detail={hold ? 'Hold each side — the timer runs twice' : 'Do the reps on each side'}
                on={setup.perSide}
                onChange={perSide => store.setSetup(exercise, { perSide })}
              />
            </div>
            <div className="px-4 py-3">
              <ToggleRow
                label="Rest between sets"
                detail="A timer after each set"
                on={setup.restOn}
                onChange={restOn => store.setSetup(exercise, { restOn })}
              />
            </div>
            {setup.restOn && (
              <div className="px-4 py-2.5 space-y-2">
                <StepperRow
                  label="Rest length"
                  value={setup.rest}
                  step={15}
                  min={15}
                  format={s => fmtClock(s * 1000)}
                  onChange={rest => store.setSetup(exercise, { rest })}
                />
                <p className="text-xs text-stone-400">Starts automatically each time you tick a set.</p>
              </div>
            )}
          </div>
        </SettingsSheet>
      )}
    </div>
  )
}

// The weight as the card shows it under the name, by equipment.
function loadSummary(equipment, log) {
  const w = `${fmt(log.weight)} lbs`
  if (equipment === 'bodyweight') return log.weight > 0 ? `Bodyweight + ${w}` : 'Bodyweight'
  if (equipment === 'assisted') return `Assisted · ${w}`
  if (equipment === 'barbell' && log.bar > 0 && log.weight > log.bar) return `${w} · ${fmt((log.weight - log.bar) / 2)} lb/side`
  return w
}

// What an exercise is done with, as a row of icon buttons.
const EQUIPMENT_ICON = {
  barbell: <><path d="M2 12h20" /><path d="M5 7v10M8 8v8M16 8v8M19 7v10" /></>,
  dumbbell: <><path d="M8 12h8" /><rect x="4" y="8" width="4" height="8" rx="1" /><rect x="16" y="8" width="4" height="8" rx="1" /></>,
  cable: <><path d="M12 3v11M8 3h8" /><circle cx="12" cy="17" r="3" /></>,
  machine: <><rect x="7" y="4" width="10" height="16" rx="1.5" /><path d="M7 9h10M7 13h10M7 17h10" /></>,
  bodyweight: <><circle cx="12" cy="5" r="2" /><path d="M12 7v7M8 10h8M12 14l-3 6M12 14l3 6" /></>,
  assisted: <path d="M12 20V6M7 11l5-5 5 5" />,
}
function EquipmentPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-6 gap-1 rounded-xl bg-stone-100 p-1" role="radiogroup" aria-label="Equipment">
      {EQUIPMENT.map(e => (
        <button
          key={e.id}
          role="radio"
          aria-checked={value === e.id}
          onClick={() => onChange(e.id)}
          className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-semibold transition-colors ${
            value === e.id ? 'bg-white text-accent-500 shadow-sm' : 'text-stone-400'
          }`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">{EQUIPMENT_ICON[e.id]}</svg>
          {e.label}
        </button>
      ))}
    </div>
  )
}

// The weight, big, with − / + either side (tap the number to type it) and a
// line on what it means for the equipment. A barbell also draws its plates.
const PLATES = [45, 35, 25, 10, 5, 2.5]
const PLATE_HEIGHT = { 45: 46, 35: 40, 25: 34, 10: 26, 5: 20, 2.5: 15 }
function platesFor(perSide) {
  const plates = []
  let left = perSide
  for (const p of PLATES) {
    while (left >= p - 1e-9) {
      plates.push(p)
      left -= p
    }
  }
  return { plates, left: Math.round(left * 100) / 100 }
}
// − / + move to the next round number: 5s on a barbell, 2.5s otherwise.
const stepTo = (v, step, dir) => Math.max(0, (dir > 0 ? Math.floor(v / step + 1e-9) + 1 : Math.ceil(v / step - 1e-9) - 1) * step)

function LoadHero({ equipment, weight, bar, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const step = equipment === 'barbell' ? 5 : 2.5
  const perSide = equipment === 'barbell' && bar > 0 ? Math.max(0, (weight - bar) / 2) : null
  const { plates, left } = platesFor(perSide ?? 0)
  const unit = { dumbbell: 'lbs each', assisted: 'lbs help' }[equipment] ?? 'lbs'
  const note = {
    barbell: bar > 0 ? `${fmt(bar)} lb bar · ${perSide > 0 ? `${fmt(perSide)} lb each side` : 'empty bar'}` : 'Set the bar weight below',
    dumbbell: 'The weight of one dumbbell',
    cable: 'The number on the stack',
    machine: 'The number on the stack or plates loaded',
    bodyweight: weight > 0 ? 'Added with a belt, vest or plate' : 'Your bodyweight. Add weight once it gets easy.',
    assisted: 'Help from the machine or band. Lower = harder.',
  }[equipment]

  function save() {
    setEditing(false)
    const n = parseFloat(draft)
    if (!isNaN(n) && n >= 0) onChange(Math.round(n * 100) / 100)
  }

  const btn = 'w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-600 text-2xl font-medium active:bg-stone-200 transition-colors'
  return (
    <div className="flex flex-col items-center gap-2 py-1">
      <div className="flex items-center gap-5">
        <button onClick={() => onChange(stepTo(weight, step, -1))} className={btn} aria-label="Less weight">−</button>
        {editing ? (
          <input
            type="number"
            inputMode="decimal"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={e => e.key === 'Enter' && save()}
            autoFocus
            className="w-28 text-center text-4xl font-bold bg-stone-100 rounded-xl py-1 text-stone-900 outline-none"
          />
        ) : (
          <button onClick={() => { setDraft(String(weight)); setEditing(true) }} className="min-w-28 text-center active:opacity-60">
            <span className="text-5xl font-bold tracking-tight text-stone-900">{equipment === 'bodyweight' ? '+' : ''}{fmt(weight)}</span>
            <span className="ml-1.5 text-base font-medium text-stone-400">{unit}</span>
          </button>
        )}
        <button onClick={() => onChange(stepTo(weight, step, 1))} className={btn} aria-label="More weight">+</button>
      </div>
      {perSide > 0 && (
        <div className="flex items-center h-12" aria-hidden="true">
          {[...plates].reverse().map((p, i) => <span key={`l${i}`} className="w-2.5 rounded-sm bg-accent-500 mx-px" style={{ height: PLATE_HEIGHT[p] }} />)}
          <span className="w-24 h-2 rounded-full bg-stone-400" />
          {plates.map((p, i) => <span key={`r${i}`} className="w-2.5 rounded-sm bg-accent-500 mx-px" style={{ height: PLATE_HEIGHT[p] }} />)}
        </div>
      )}
      <p className="text-sm text-stone-500 text-center">
        {note}
        {perSide > 0 && plates.length > 0 && <span className="block text-xs text-stone-400">Each side: {plates.map(fmt).join(' + ')}{left > 0 ? ` + ${fmt(left)}` : ''}</span>}
      </p>
    </div>
  )
}

// ── Building blocks for the settings sheet ──────────────────────────────────
function SheetSection({ title, children }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">{title}</p>
      {children}
    </div>
  )
}

export function Segmented({ label, value, options, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-base text-stone-600">{label}</span>
      <div className="bg-stone-100 rounded-xl p-1 flex">
        {options.map(([key, text]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              value === key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ToggleRow({ label, detail, on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} className="flex items-center justify-between gap-3 w-full text-left active:opacity-70">
      <span>
        <span className="block text-base text-stone-600">{label}</span>
        {detail && <span className="block text-xs text-stone-400">{detail}</span>}
      </span>
      <span className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${on ? 'bg-accent-500' : 'bg-stone-300'}`}>
        <span className={`block w-5 h-5 rounded-full bg-[#fff] shadow-sm transition-transform ${on ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  )
}

// ── Stretch card ─────────────────────────────────────────────────────────────
function StretchCard({ stretch, checked, onToggle, onTimer, customDuration, onDurationChange, perSide, onPerSideChange, sets, onSetsChange, rest, onRestChange }) {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className={`rounded-2xl p-4 transition-all ${
      checked ? 'bg-accent-50 border border-accent-200' : 'bg-white shadow-sm'
    }`}>
      <div className="flex items-center gap-3">
        <button onClick={onToggle} className="shrink-0 active:scale-95 transition-transform">
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            checked ? 'border-accent-500 bg-accent-500' : 'border-stone-200'
          }`}>
            {checked && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </button>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold ${checked ? 'text-accent-500' : 'text-stone-900'}`}>{stretch.name}</p>
          <p className="mt-0.5 text-stone-400 text-sm whitespace-nowrap">{customDuration}s{perSide ? ' per side' : ''}{sets > 1 ? ` × ${sets}` : ''}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <HowToButton item={stretch} kind="stretch" className="w-10 h-10" />
          <button
            onClick={() => setShowSettings(true)}
            aria-label={`${stretch.name} settings`}
            className="w-10 h-10 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center active:bg-stone-200 transition-colors mr-1.5"
          >
            <GearIcon size={20} />
          </button>
          <button
            onClick={onTimer}
            className="w-11 h-11 rounded-xl bg-accent-100 flex items-center justify-center active:bg-accent-200 transition-colors"
          >
            <ClockIcon size={20} />
          </button>
        </div>
      </div>

      {showSettings && (
        <SettingsSheet title={stretch.name} onClose={() => setShowSettings(false)}>
          <StepperRow
            label="Duration"
            value={customDuration}
            step={5}
            min={5}
            editable
            suffix="s"
            onChange={onDurationChange}
          />
          <StepperRow
            label="Sets"
            value={sets}
            step={1}
            min={1}
            max={4}
            onChange={onSetsChange}
          />
          {sets > 1 && (
            <StepperRow
              label="Rest between sets"
              value={rest}
              step={5}
              min={5}
              format={s => fmtClock(s * 1000)}
              onChange={onRestChange}
            />
          )}
          <ToggleRow
            label="Per side"
            detail="Hold each side — the timer runs twice"
            on={perSide}
            onChange={onPerSideChange}
          />
        </SettingsSheet>
      )}
    </div>
  )
}
