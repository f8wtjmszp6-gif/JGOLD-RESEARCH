import { Fragment, useEffect, useRef, useState } from 'react'
import { playBeep, playTick, unlockAudio } from '../utils/sound'
import { useCountdown, useWakeLock, fmtClock } from '../hooks/timing'
import { workouts, STRETCH_ROUTINE, BAR_MIN, BAR_MAX, BAR_STEP, MUSCLE_GROUPS } from '../data/workout'
import { EXERCISE_BANK, EXERCISE_BY_ID, SUGGESTED_GROUPS, fitsPlan, isCore, ratingFor, ratingLabel, coverage, coversOf, gapsAfter } from '../data/exercises'
import { HowToToggle, HowToBody } from './HowTo'
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

        {tab === 'exercises' && store.getExercises(workoutId).map((exercise, i, list) => (
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
            onSetDone={setsLeft => startRest(exercise, setsLeft)}
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
  // The stretch picker: adding, or swapping out `swap`.
  const [picker, setPicker] = useState(null) // { swap?: stretch }
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
          onSwap={() => setPicker({ swap: stretch })}
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

      {editing && !picker && (
        <SettingsSheet title="Edit stretches" onClose={() => setEditing(false)}>
          <StretchListEditor listId={workout.id} store={store} onAdd={() => setPicker({})} />
        </SettingsSheet>
      )}
      {picker && (
        <StretchPicker
          listId={workout.id}
          store={store}
          swap={picker.swap}
          onPick={id => {
            if (picker.swap) store.swapStretch(workout.id, picker.swap.id, id)
            else store.addStretch(workout.id, id)
            setPicker(null)
          }}
          onClose={() => setPicker(null)}
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
            <RatingMeter rating={stretchRating(x, listId)} />
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
      {store.isCustomStretches(listId) && (
        <button onClick={() => store.resetStretches(listId)} className="text-xs font-medium text-accent-500 active:opacity-60">
          Reset to default stretches
        </button>
      )}
    </>
  )
}

// The stretches that fit the list and aren't in it yet, by body area, best
// first. Swapping shows the swapped stretch's area first; adding, the areas
// this workout works.
function StretchPicker({ listId, store, swap, onPick, onClose }) {
  return (
    <BankPicker
      title={swap ? `Swap ${swap.name}` : 'Add a stretch'}
      noun="stretches"
      kind="stretch"
      sections={STRETCH_AREAS}
      sectionOf={x => x.area}
      bank={STRETCH_BANK.filter(x => stretchFits(x, listId))}
      rate={x => stretchRating(x, listId)}
      rateFor={listId === STRETCH_ROUTINE.id ? 'full body' : workouts[listId]?.short}
      exclude={store.getStretches(listId).map(x => x.id)}
      first={swap ? [swap.area] : SUGGESTED_AREAS[listId] ?? []}
      onPick={onPick}
      onClose={onClose}
    />
  )
}

// The same for exercises, by the muscle group Trends files them under.
// Only exercises that fit: for the main list, what the plan is for; for the
// Core section, core exercises.
// Exercises that cover an area the list is missing are marked "Fills" and
// listed first. A swap that would leave an area uncovered asks first.
function ExercisePicker({ workoutId, store, swap, section, onPick, onClose }) {
  const core = section === 'core'
  const area = core ? 'core' : workoutId
  const sections = store.getExerciseSections(workoutId)
  const list = core ? sections.core : sections.main
  const base = swap ? list.filter(x => x.id !== swap.id) : list
  const missing = coverage(base, area).filter(a => !a.covered)
  const fills = x => missing.filter(a => coversOf(x).includes(a.id)).map(a => a.label)
  const names = missing.map(a => a.label).join(' and ')
  const lost = swap ? gapsAfter(list, base, area) : []
  const [confirm, setConfirm] = useState(null) // id waiting on "swap anyway"

  function pick(id) {
    if (swap && gapsAfter(list, [...base, EXERCISE_BY_ID[id]], area).length) setConfirm(id)
    else onPick(id)
  }

  if (confirm) {
    const left = gapsAfter(list, [...base, EXERCISE_BY_ID[confirm]], area).join(' and ')
    return (
      <ConfirmSheet
        title={`Leave ${left} uncovered?`}
        body={`${EXERCISE_BY_ID[confirm].name} doesn't work ${left}, so this workout won't either.`}
        confirmLabel="Swap anyway"
        onConfirm={() => onPick(confirm)}
        onClose={() => setConfirm(null)}
      />
    )
  }

  return (
    <BankPicker
      fills={fills}
      banner={lost.length
        ? `Swapping out ${swap.name} leaves ${lost.join(' and ')} uncovered. Exercises marked Fills keep it covered.`
        : missing.length ? `Not covered yet: ${names}. Exercises marked Fills cover it.` : null}
      title={swap ? `Swap ${swap.name}` : core ? 'Add a core exercise' : 'Add an exercise'}
      noun="exercises"
      kind="exercise"
      sections={MUSCLE_GROUPS}
      sectionOf={x => x.group}
      bank={EXERCISE_BANK.filter(x => (core ? isCore(x) : fitsPlan(x, workoutId)))}
      rate={x => ratingFor(x, core ? 'core' : workoutId)}
      rateFor={core ? 'core' : workouts[workoutId]?.short}
      exclude={store.getExercises(workoutId).map(x => x.id)}
      first={swap ? [swap.group] : core ? [] : SUGGESTED_GROUPS[workoutId] ?? []}
      onPick={pick}
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

// How well an exercise targets its plan, as three rising bars (like signal
// strength): 3 Best, 2 Good, 1 Okay.
const METER_FILL = { 3: 'bg-emerald-600', 2: 'bg-stone-500', 1: 'bg-stone-400' }
function RatingMeter({ rating, label }) {
  return (
    <span className="flex items-center gap-1.5 shrink-0" role="img" aria-label={`${ratingLabel(rating)} for this workout`}>
      {label && <span className={`text-xs ${rating === 3 ? 'font-semibold text-emerald-700' : 'text-stone-400'}`}>{ratingLabel(rating)}</span>}
      <span className="flex items-end gap-[2px] h-3">
        {[1, 2, 3].map(i => (
          <span key={i} className={`w-[3px] rounded-sm ${i <= rating ? METER_FILL[rating] : 'bg-stone-200'}`} style={{ height: `${4 + i * 2.7}px` }} />
        ))}
      </span>
    </span>
  )
}

// A searchable list of a bank, in sections, suggested sections first, minus
// what's already in the list.
// With `rate`, each row shows how well it targets what it's for (rated for
// `rateFor`), best first within each section.
function BankPicker({ title, noun, kind, sections, sectionOf, bank, exclude, first, rate, rateFor, fills, banner, onPick, onClose }) {
  const [query, setQuery] = useState('')
  const [info, setInfo] = useState(null) // the item whose how-to is open
  const skip = new Set(exclude)
  const rank = x => (first.includes(x.id) ? first.indexOf(x.id) : first.length)
  const q = query.trim().toLowerCase()
  const groups = [...sections]
    .sort((a, b) => rank(a) - rank(b))
    .map(sec => ({
      sec,
      items: bank
        .filter(x => sectionOf(x) === sec.id && !skip.has(x.id) && (!q || x.name.toLowerCase().includes(q)))
        .sort((a, b) => (fills ? fills(b).length - fills(a).length : 0) || (rate ? rate(b) - rate(a) : 0)),
    }))
    .filter(g => g.items.length)
    // Groups with an exercise that fills a gap come first.
    .sort((a, b) => (fills ? Number(fills(b.items[0]).length > 0) - Number(fills(a.items[0]).length > 0) : 0))

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
      {rate && (
        <div className="flex items-center gap-3 text-xs text-stone-500 -mt-2">
          <span>How well each fits {rateFor === 'core' ? 'your core' : rateFor}:</span>
          {[3, 2, 1].map(r => (
            <span key={r} className="flex items-center gap-1"><RatingMeter rating={r} />{ratingLabel(r)}</span>
          ))}
        </div>
      )}
      {banner && <p className="rounded-xl bg-orange-50 text-orange-700 text-sm px-3.5 py-2.5 leading-relaxed">{banner}</p>}
      {groups.length === 0 && <p className="text-sm text-stone-400">No {noun} match “{query}”.</p>}
      {groups.map(({ sec, items }) => (
        <div key={sec.id}>
          <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mb-1.5">
            {sec.label}{first.includes(sec.id) && <span className="normal-case tracking-normal text-accent-500"> · suggested</span>}
          </p>
          <div className="divide-y divide-stone-100 rounded-xl bg-stone-50">
            {items.map(x => (
              <div key={x.id}>
                <div className="flex items-center">
                  <button onClick={() => onPick(x.id)} className="flex-1 min-w-0 flex items-center justify-between gap-2 pl-3.5 pr-1 py-2.5 text-left text-sm text-stone-800 active:bg-stone-100">
                    <span className="min-w-0">
                      {x.name}
                      {fills?.(x).length > 0 && (
                        <span className="block text-xs font-semibold text-emerald-700 mt-0.5">Fills: {fills(x).join(', ')}</span>
                      )}
                    </span>
                    {rate && <RatingMeter rating={rate(x)} label />}
                  </button>
                  <button
                    onClick={() => setInfo(info === x.id ? null : x.id)}
                    aria-label={`How to do ${x.name}`}
                    aria-expanded={info === x.id}
                    className={`w-10 h-10 mr-1 rounded-lg flex items-center justify-center shrink-0 active:bg-stone-100 ${info === x.id ? 'text-accent-500' : 'text-stone-400'}`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9.5" /><path d="M12 11v5.5M12 7.6v.1" strokeWidth="2.4" /></svg>
                  </button>
                </div>
                {info === x.id && (
                  <div className="px-3.5 pb-3.5">
                    <HowToBody item={x} kind={kind} />
                    <button
                      onClick={() => onPick(x.id)}
                      className="mt-3 w-full py-2.5 rounded-xl bg-accent-500 text-white text-sm font-semibold active:bg-accent-600 transition-colors"
                    >
                      {title.startsWith('Swap') ? 'Swap this in' : 'Add this'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
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
  const rows = (list, minOne, ratedFor) => (
    <div className="space-y-1.5">
      {list.map((ex, i) => (
        <div key={ex.id} className="flex items-center gap-1.5 rounded-xl bg-stone-50 pl-3 pr-1.5 py-1.5">
          <span className="text-xs font-semibold text-stone-400 w-4 shrink-0">{i + 1}</span>
          <span className="flex-1 min-w-0 truncate text-sm text-stone-700">{ex.name}</span>
          <RatingMeter rating={ratingFor(ex, ratedFor)} />
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
      {rows(main, true, workoutId)}
      {addBtn('+ Add exercise', 'main')}
      {/* The Core section's own list, while Core is on (switch at the top). */}
      {coreOn && (
        <div className="pt-4 border-t border-stone-100 space-y-3">
          <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">Core</p>
          <CoverageRow list={core} area="core" />
          {core.length > 0 ? rows(core, false, 'core') : <p className="text-sm text-stone-400">No core exercises yet.</p>}
          {addBtn('+ Add core exercise', 'core')}
        </div>
      )}
      {store.isCustomOrder(workoutId) && (
        <button onClick={() => store.resetOrder(workoutId)} className="text-xs font-medium text-accent-500 active:opacity-60">
          Reset to default exercises
        </button>
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

export function GearIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
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

      <button onClick={onToggle} className="shrink-0 active:scale-95 transition-transform ml-0.5">
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
function ExerciseCard({ exercise, workoutId, store, onTimer, onSetDone }) {
  const [showSettings, setShowSettings] = useState(false)
  const [swapping, setSwapping] = useState(false)
  // A finished exercise collapses to one line; tapping it reopens the card.
  const [expanded, setExpanded] = useState(false)

  const log = store.getLog(workoutId, exercise)
  const assist = store.getAssist(exercise.id, exercise.weight.assist ?? false)
  const setup = store.getSetup(exercise)
  const hold = setup.mode === 'hold'

  const allDone = log.sets.every(x => x.done)
  const someDone = log.sets.some(x => x.done)

  // Adding or unticking a set reopens the card; finishing again collapses it.
  const [prevAllDone, setPrevAllDone] = useState(allDone)
  if (allDone !== prevAllDone) {
    setPrevAllDone(allDone)
    if (!allDone) setExpanded(false)
  }
  const collapsed = allDone && !expanded
  const perSide = log.bar > 0 ? (log.weight - log.bar) / 2 : null
  const holdTime = log.sets[0]?.reps ?? 0

  let summary
  if (hold) {
    summary = log.weight > 0 ? `+${fmt(log.weight)} lbs` : 'Bodyweight'
  } else if (log.weight === 0 && log.bar === 0) {
    summary = assist ? 'Assisted' : 'Bodyweight'
  } else {
    const wp = `${fmt(log.weight)} lbs${log.bar > 0 ? ` · ${fmt(perSide)} lb/side` : ''}`
    summary = assist ? `Assisted · ${wp}` : wp
  }

  if (collapsed) {
    const done = hold
      ? `${log.sets.length} × ${log.sets[0]?.reps ?? 0}s`
      : `${log.weight > 0 ? `${fmt(log.weight)} lbs · ` : ''}${log.sets.map(x => x.reps).join(', ')}`
    return (
      <button
        onClick={() => setExpanded(true)}
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
          <button
            onClick={() => setShowSettings(true)}
            className="mt-1 flex items-center gap-1 text-left active:opacity-60"
          >
            <span className={`text-sm font-medium ${assist ? 'text-stone-400' : 'text-stone-600'}`}>
              {summary}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-stone-300 shrink-0"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowSettings(true)}
            aria-label={`${exercise.name} settings`}
            className="w-8 h-8 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center active:bg-stone-200 transition-colors mr-1.5"
          >
            <GearIcon />
          </button>
          {onTimer && (
            <button
              onClick={onTimer}
              className="w-8 h-8 rounded-xl bg-accent-100 flex items-center justify-center active:bg-accent-200 transition-colors"
            >
              <ClockIcon />
            </button>
          )}
          <button
            onClick={() => store.toggleExercise(workoutId, exercise)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors text-xs font-bold ${
              allDone ? 'bg-accent-500 text-white' : 'bg-stone-100 text-stone-400 active:bg-stone-200'
            }`}
            aria-label={allDone ? 'Untick all sets' : 'Tick all sets'}
          >
            {allDone ? '✓' : 'All'}
          </button>
        </div>
      </div>

      {/* Program target, for reference — the set rows hold your own numbers */}
      <div className="flex items-center gap-2 mt-1.5">
        {/* The program's target only means something in its own mode. */}
        {hold === !!exercise.isTime && (
          <p className="text-xs text-stone-400">Program target {exercise.sets} × {exercise.reps}</p>
        )}
        {setup.restOn && (
          <span className="text-xs font-medium text-accent-600 bg-accent-50 px-1.5 py-0.5 rounded-md">Rest {fmtClock(setup.rest * 1000)}</span>
        )}
      </div>

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
          <button onClick={() => setExpanded(false)} className="text-xs font-medium text-stone-400 ml-auto active:text-stone-600">
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
          <HowToToggle item={exercise} kind="exercise" />
          <SheetSection title="Sets">
            <Segmented
              label="Counted in"
              value={setup.mode}
              options={[['reps', 'Reps'], ['hold', 'Hold']]}
              onChange={mode => store.setSetup(exercise, { mode })}
            />
            {hold ? (
              <>
                <StepperRow
                  label="Hold time"
                  value={holdTime}
                  step={5}
                  min={5}
                  editable
                  suffix="s"
                  onChange={v => store.setHoldTime(exercise, v)}
                />
                <p className="text-xs text-stone-400 -mt-1">Tap the clock on the card to time each set — it ticks the set when time’s up.</p>
              </>
            ) : (
              <p className="text-xs text-stone-400 -mt-1">Each set is a number of reps — adjust them on the card as you go.</p>
            )}
            <ToggleRow
              label="Per side"
              detail={hold ? 'Hold each side — the timer runs twice' : 'Do the reps on each side'}
              on={setup.perSide}
              onChange={perSide => store.setSetup(exercise, { perSide })}
            />
          </SheetSection>
          {hold ? (
            <SheetSection title="Load">
              <StepperRow
                label="Added weight"
                value={log.weight}
                step={0.5}
                min={0}
                editable
                onChange={v => store.setWeight(exercise, v)}
              />
              <p className="text-xs text-stone-400 -mt-1">Leave at 0 for bodyweight — add a plate once holds get easy.</p>
            </SheetSection>
          ) : (
          <SheetSection title="Load">
          <StepperRow
            label="Weight"
            value={log.weight}
            step={0.5}
            min={0}
            editable
            onChange={v => store.setWeight(exercise, v)}
          />
          <StepperRow
            label="Bar"
            value={log.bar}
            step={BAR_STEP}
            min={BAR_MIN}
            max={BAR_MAX}
            onChange={v => store.setBar(exercise, v)}
          />
          {log.bar > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-accent-50 px-3.5 py-3">
              <span className="text-sm text-stone-500">Plates per side</span>
              <span className="text-accent-600 font-bold">
                {perSide > 0 ? `${fmt(perSide)} lb each side` : 'Empty bar'}
              </span>
            </div>
          )}
          <ToggleRow
            label="Assist"
            detail="Not lifting the full load (assisted or bodyweight)"
            on={assist}
            onChange={v => store.setAssist(exercise.id, v)}
          />
          </SheetSection>
          )}
          <SheetSection title="Rest timer">
            <Segmented
              label="Between sets"
              value={setup.restOn ? 'on' : 'off'}
              options={[['off', 'Off'], ['on', 'On']]}
              onChange={v => store.setSetup(exercise, { restOn: v === 'on' })}
            />
            {setup.restOn && (
              <>
                <StepperRow
                  label="Rest length"
                  value={setup.rest}
                  step={15}
                  min={15}
                  format={s => fmtClock(s * 1000)}
                  onChange={rest => store.setSetup(exercise, { rest })}
                />
                <p className="text-xs text-stone-400 -mt-1">Starts automatically each time you tick a set.</p>
              </>
            )}
          </SheetSection>
          <button
            onClick={() => { setShowSettings(false); setSwapping(true) }}
            className="w-full py-3 rounded-xl bg-stone-100 text-stone-700 text-sm font-semibold active:bg-stone-200 transition-colors"
          >
            Swap exercise
          </button>
        </SettingsSheet>
      )}
      {swapping && (
        <ExercisePicker
          workoutId={workoutId}
          store={store}
          swap={exercise}
          section={isCore(exercise) ? 'core' : 'main'}
          onPick={id => { store.swapExercise(workoutId, exercise.id, id); setSwapping(false) }}
          onClose={() => setSwapping(false)}
        />
      )}
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
function StretchCard({ stretch, onSwap, checked, onToggle, onTimer, customDuration, onDurationChange, perSide, onPerSideChange, sets, onSetsChange, rest, onRestChange }) {
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
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-1 mt-0.5 text-left active:opacity-60 min-w-0 max-w-full overflow-hidden">
            <span className="text-stone-400 text-sm whitespace-nowrap shrink-0">{customDuration}s{perSide ? ' per side' : ''}{sets > 1 ? ` × ${sets}` : ''}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-stone-300 shrink-0"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowSettings(true)}
            aria-label={`${stretch.name} settings`}
            className="w-9 h-9 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center active:bg-stone-200 transition-colors mr-1.5"
          >
            <GearIcon />
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
          <HowToToggle item={stretch} kind="stretch" />
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
          <button
            onClick={() => { setShowSettings(false); onSwap() }}
            className="w-full py-3 rounded-xl bg-stone-100 text-stone-700 text-sm font-semibold active:bg-stone-200 transition-colors"
          >
            Swap stretch
          </button>
        </SettingsSheet>
      )}
    </div>
  )
}
