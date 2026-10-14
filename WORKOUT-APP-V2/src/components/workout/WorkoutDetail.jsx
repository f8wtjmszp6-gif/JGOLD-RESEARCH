import { Fragment, useEffect, useRef, useState } from 'react'
import { playBeep, playGo, playTick, unlockAudio } from '../../utils/sound'
import { useCountdown, useWakeLock } from '../../hooks/timing'
import { workouts, STRETCH_ROUTINE, COOL_DOWNS, COOL_DOWN_BY_ID, FULL_BODY, FULL_BODY_BY_ID } from '../../data/workout'
import { gapsAfter } from '../../data/exercises'
import { weekRange, sameDay } from '../../utils/days'
import { TimerBar } from './TimerBar'
import { StretchesTab } from './StretchesTab'
import { ExercisePicker } from './pickers'
import { ConfirmSheet, SettingsSheet } from '../ui/Sheet'
import { CoveragePill, GapRows, AddRow } from './coverage'
import { SwipeRow } from '../ui/SwipeRow'
import { useDragReorder } from '../../hooks/useDragReorder'
import { warmupSetLabel } from '../../utils/format'
import { WarmupCard } from './WarmupCard'
import { ExerciseCard } from './ExerciseCard'

let timerSeq = 0

export default function WorkoutDetail({ workoutId, store, onBack, onSwitch }) {
  // The full-body stretch routine and the cool-downs reuse this screen with
  // just their stretches.
  const cool = COOL_DOWN_BY_ID[workoutId]
  const workout = workouts[workoutId] ?? cool ?? STRETCH_ROUTINE
  const isRoutine = workout.exercises.length === 0
  const [tab, setTab] = useState(isRoutine ? 'stretches' : 'exercises')
  const [adding, setAdding] = useState(null) // 'main' | 'core': the exercise bank is open
  // The first set ticked (or warm-up, or last stretch) on a rest day asks whether it's
  // still a rest day, once. A plan already ticked when you open it doesn't ask.
  const stamps = store.stampsOf(workoutId)
  const clash = [stamps.at, stamps.warmedAt, stamps.stretchedAt].find(t => t && store.restIndexOn(t) >= 0) ?? null
  const [answered, setAnswered] = useState(clash)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  function removeRest() {
    const i = store.restIndexOn(clash)
    const at = store.restDays[i]
    store.deleteRest(i)
    setAnswered(clash)
    setToast({ text: 'Rest day removed', undo: () => store.addRest(at) })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }
  const warmup = store.getWarmup(workoutId)
  // Every exercise starts folded; tapping one opens it (and folds any other).
  // Finishing it folds it again.
  const [openId, setOpenId] = useState(null)
  const exercises = store.getExercises(workoutId)
  const openExercise = exercises.some(x => x.id === openId) ? openId : null

  // Drag an exercise by its handle within its own list (main or Core).
  const listRef = useRef(null)
  const exerciseDrag = useDragReorder(
    listRef,
    id => {
      const { main, core } = store.getExerciseSections(workoutId)
      return (main.some(x => x.id === id) ? main : core).map(x => x.id)
    },
    (id, to) => store.moveExerciseTo(workoutId, id, to),
  )

  // Swiping an exercise away: removing the only exercise for an area asks first.
  const [removing, setRemoving] = useState(null) // { ex, gaps } waiting on "remove anyway"
  function removeExercise(ex) {
    const { main, core } = store.getExerciseSections(workoutId)
    const inCore = core.some(x => x.id === ex.id)
    const list = inCore ? core : main
    const gaps = gapsAfter(list, list.filter(x => x.id !== ex.id), inCore ? 'core' : workoutId)
    if (gaps.length) setRemoving({ ex, gaps })
    else store.removeExercise(workoutId, ex.id)
  }

  // The one timer on screen, shown in the bar at the bottom.
  //   kind  – 'rest' | 'hold' | 'stretch'
  //   side / sides – per-side holds and stretches run twice
  //   phase – 'ready' (3 s to get into position) | 'running' | 'switch'
  //           (between sides) | 'rest' (between stretch sets) | 'over'
  const [active, setActive] = useState(null)
  // The timer opened full screen (it goes back to the bar when it ends).
  const [fullTimer, setFullTimer] = useState(false)
  const clock = useCountdown(({ start }) => {
    const a = active
    if (!a) return
    // Get-ready over: the timer itself starts now.
    if (a.phase === 'ready') {
      playGo()
      setActive({ ...a, phase: 'running' })
      start(a.total)
      return
    }
    playBeep()

    // A warm-up goes straight into its next set; the beep says change pace.
    if (a.kind === 'warmup' && a.set < a.sets) {
      const part = a.parts[a.set]
      setActive({ ...a, set: a.set + 1, title: warmupSetLabel(part), total: part.minutes * 60000 })
      start(part.minutes * 60000)
      return
    }
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
      const all = store.getLog(workoutId, a.exercise).all
      const set = all.find(x => x.part === a.part && x.index === a.index)
      if (set && !set.done) {
        if (a.part < 0) store.toggleSet(workoutId, a.exercise, a.index)
        else store.togglePartSet(workoutId, a.exercise, a.part, a.index)
      }
      const left = all.filter(x => !x.done && x !== set).length
      if (startRest(a.exercise, left)) return // rolls straight into rest
    }
    if (a.kind === 'warmup') store.setWarmupDone(workoutId, true)
    if (a.kind === 'stretch' && !store.getStretchDone(workoutId, a.stretchId)) {
      store.toggleStretch(workoutId, a.stretchId)
    }

    setActive({ ...a, phase: 'over' })
    // Rest waits for you to dismiss it; a finished hold or stretch clears itself.
    if (a.kind !== 'rest') {
      setTimeout(() => {
        setActive(x => (x?.id === a.id ? null : x))
        setFullTimer(false)
      }, 1600)
    }
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

  // Holds, stretches and warm-ups count you in first (Settings › Get-ready
  // time); a rest starts right away.
  const prepMs = store.timer.prep * 1000
  function run(timer) {
    unlockAudio()
    const ready = timer.kind !== 'rest' && prepMs > 0
    setActive({ id: ++timerSeq, side: 1, sides: 1, set: 1, sets: 1, phase: ready ? 'ready' : 'running', ...timer })
    clock.start(ready ? prepMs : timer.total)
  }

  // Skips the rest of the count-in.
  function goNow() {
    playGo()
    setActive(a => ({ ...a, phase: 'running' }))
    clock.start(active.total)
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

  // Times the next hold you haven't ticked off yet (split cards included),
  // from that set's seconds.
  function startHold(exercise) {
    const all = store.getLog(workoutId, exercise).all
    const set = all.find(x => !x.done) ?? all[0]
    run({
      kind: 'hold',
      title: exercise.name,
      total: set.reps * 1000,
      sides: store.getSetup(exercise).perSide ? 2 : 1,
      exercise,
      part: set.part,
      index: set.index,
    })
  }

  // Runs the warm-up's sets back to back (see the countdown's end above).
  function startWarmup() {
    const parts = warmup.sets
    run({ kind: 'warmup', title: warmupSetLabel(parts[0]), total: parts[0].minutes * 60000, sets: parts.length, parts })
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
    setFullTimer(false)
  }

  // "Start" between rounds: the next side, or side 1 of the next set, after
  // the same count-in.
  function startNextSide() {
    unlockAudio()
    const phase = prepMs > 0 ? 'ready' : 'running'
    setActive(a => (a.side < a.sides
      ? { ...a, side: a.side + 1, phase }
      : { ...a, set: a.set + 1, side: 1, phase }))
    clock.start(prepMs > 0 ? prepMs : active.total)
  }

  // "Start" after a rest: a hold begins its next countdown; for reps it just
  // clears the bar so you can lift.
  function startNextSet() {
    const exercise = active?.exercise
    if (exercise && store.getSetup(exercise).mode === 'hold') startHold(exercise)
    else stopTimer()
  }

  // One exercise in the list: dragged by its handle, swiped to remove.
  const sections = store.getExerciseSections(workoutId)
  const finished = x => store.getLog(workoutId, x).all.every(set => set.done)
  const partDone = list => list.length > 0 && list.every(finished)
  const partProgress = list => `${list.filter(finished).length} of ${list.length}`
  const exerciseCard = exercise => {
    const open = exercise.id === openExercise
    const card = (
      <ExerciseCard
        exercise={exercise}
        workoutId={workoutId}
        store={store}
        grip={exerciseDrag.handlers(exercise.id)}
        open={open}
        onOpen={() => setOpenId(exercise.id)}
        onClose={() => setOpenId(null)}
        onSetDone={setsLeft => {
          startRest(exercise, setsLeft)
          if (setsLeft === 0) setOpenId(null)
        }}
        onTimer={store.getSetup(exercise).mode === 'hold' ? () => startHold(exercise) : null}
      />
    )
    // Folded or open, swipe it left to remove it.
    return (
      <div key={exercise.id} data-row={exercise.id} style={exerciseDrag.style(exercise.id)} className={exerciseDrag.dragging === exercise.id ? 'rounded-2xl shadow-lg' : ''}>
        <SwipeRow label={exercise.name} onRemove={() => removeExercise(exercise)}>{card}</SwipeRow>
      </div>
    )
  }

  // What comes after a rest, read live so ticking during the rest updates it.
  let next = null
  if (active?.kind === 'rest' && active.exercise) {
    const sets = store.getLog(workoutId, active.exercise).all
    const index = sets.findIndex(x => !x.done)
    next = { complete: index === -1, set: index + 1, of: sets.length }
  }

  const exerciseList = store.getExercises(workoutId)
  const exerciseDone = exerciseList.filter(e => store.getLog(workoutId, e).all.every(x => x.done)).length
  const stretchList = store.getStretches(workout.id)
  const stretchDone = stretchList.filter(s => store.getStretchDone(workoutId, s.id)).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 bg-stone-50 shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-accent-500 mb-4 active:opacity-70">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {/* In a saved week, back goes to that week. */}
          <span className="text-sm font-medium">{store.past ? weekRange(store.weekStart) : 'Workouts'}</span>
        </button>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">{FULL_BODY_BY_ID[workoutId] ? 'Full Body' : workout.short}</h1>
        </div>
        {FULL_BODY_BY_ID[workoutId] ? (
          <FullBodySwitch at={workoutId} onSwitch={onSwitch} />
        ) : cool ? (
          // Switch if you picked the wrong activity; each keeps its own list.
          <div className="flex flex-wrap gap-1.5 mt-3" role="tablist" aria-label="What you did">
            {COOL_DOWNS.map(c => (
              <button
                key={c.id}
                role="tab"
                aria-selected={c.id === workoutId}
                onClick={() => onSwitch(c.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${c.id === workoutId ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500 active:bg-stone-200'}`}
              >
                {c.chip}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-stone-400 text-sm mt-1">{isRoutine ? 'For days without a gym workout' : workout.name}</p>
        )}
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

      {/* The running timer, pinned above the list so it never covers it. */}
      {active && (
        <TimerBar
          full={fullTimer}
          onFull={setFullTimer}
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
          onGo={goNow}
          onClose={stopTimer}
          onStart={active.phase === 'switch' ? startNextSide : startNextSet}
        />
      )}

      {/* Content */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-5 space-y-2 pb-6">
        {/* The plan in three parts: an optional warm-up, the main workout,
            and an optional Core section. */}
        {tab === 'exercises' && (
          <>
            <PartHead title="Warm-up" right={store.getWarmup(workoutId).on && store.getWarmupDone(workoutId) ? 'Done ✓' : null} done />
            <WarmupCard workoutId={workoutId} store={store} onStart={startWarmup} />

            <PartHead
              title="Main workout"
              pill={<CoveragePill list={sections.main} area={workoutId} />}
              right={partProgress(sections.main)}
              done={partDone(sections.main)}
            />
            {sections.main.map(exerciseCard)}
            <GapRows list={sections.main} area={workoutId} onAdd={() => setAdding('main')} />
            <AddRow label="Add exercise" onClick={() => setAdding('main')} />

            {sections.coreOn ? (
              <>
                <PartHead
                  title="Core"
                  pill={<CoveragePill list={sections.core} area="core" />}
                  right={sections.core.length ? partProgress(sections.core) : null}
                  done={partDone(sections.core)}
                />
                {sections.core.map(exerciseCard)}
                <GapRows list={sections.core} area="core" onAdd={() => setAdding('core')} />
                <AddRow label="Add core exercise" onClick={() => setAdding('core')} />
              </>
            ) : (
              <>
                <PartHead title="Core" />
                <AddRow
                  label="Add core"
                  note="abs & obliques"
                  onClick={() => {
                    store.setCoreOn(workoutId, true)
                    // No core exercises yet (Chest & Shoulders starts with none): pick one.
                    if (sections.core.length === 0) setAdding('core')
                  }}
                />
              </>
            )}
          </>
        )}

        {tab === 'stretches' && (
          <StretchesTab workout={workout} store={store} onTimer={startStretch} />
        )}
      </div>

      {adding && (
        <ExercisePicker
          workoutId={workoutId}
          store={store}
          section={adding}
          onPick={id => { store.addExercise(workoutId, id); setAdding(null) }}
          onClose={() => {
            // Backing out of "Add core" before picking anything leaves Core off.
            if (adding === 'core' && sections.core.length === 0) store.setCoreOn(workoutId, false)
            setAdding(null)
          }}
        />
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
      {clash && clash !== answered && (() => {
        const day = sameDay(new Date(clash), store.today) ? 'Today' : new Date(clash).toLocaleDateString('en-US', { weekday: 'long' })
        const weekday = new Date(clash).toLocaleDateString('en-US', { weekday: 'long' })
        return (
          <SettingsSheet title={`${day} is a rest day`} closeLabel="Keep it" onClose={() => setAnswered(clash)}>
            <p className="text-stone-500 leading-relaxed">
              You marked {weekday} as a rest day. Keep it, or remove it now that you’ve {clash === stamps.stretchedAt ? 'stretched' : 'worked out'}?
            </p>
            <button onClick={removeRest} className="w-full py-3.5 rounded-2xl bg-accent-500 text-white font-semibold active:bg-accent-600 transition-colors">
              Remove rest day
            </button>
          </SettingsSheet>
        )
      })()}
      {toast && (
        <div role="status" className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 rounded-2xl bg-stone-800 text-white text-sm px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
          {toast.text}
          <button onClick={() => { toast.undo(); setToast(null) }} className="font-semibold text-blue-300 active:opacity-60">Undo</button>
        </div>
      )}
    </div>
  )
}

// A part's heading in a plan: its name, and on the right its progress (blue
// once it's all done).
function PartHead({ title, pill, right, done }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-1 pt-3 first:pt-0">
      <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">{title}</p>
      <span className="flex items-baseline gap-2">
        {pill}
        {right && <span className={`text-xs font-semibold ${done ? 'text-accent-500' : 'text-stone-400'}`}>{right}</span>}
      </span>
    </div>
  )
}

// Gym or home, as a segmented control with where each one is written over it
// ("At home" spans the two home ones). Switch if you picked the wrong one;
// each keeps its own list.
function FullBodySwitch({ at, onSwitch }) {
  const groups = [...new Set(FULL_BODY.map(p => p.where))].map(w => [w, FULL_BODY.filter(p => p.where === w)])
  return (
    <div className="mt-3">
      <div className="flex gap-2 px-1 mb-1">
        {groups.map(([where, plans]) => (
          <p key={where} style={{ flex: plans.length }} className="flex items-center gap-2 text-[10px] font-semibold tracking-widest uppercase text-stone-400">
            <span className="flex-1 h-px bg-stone-200" />
            {where}
            <span className="flex-1 h-px bg-stone-200" />
          </p>
        ))}
      </div>
      <div className="bg-stone-100 rounded-xl p-1 flex" role="tablist" aria-label="Where you are">
        {groups.map(([where, plans], i) => (
          <Fragment key={where}>
            {i > 0 && <span className="w-px my-1.5 mx-1 bg-stone-300" />}
            {plans.map(p => (
              <button
                key={p.id}
                role="tab"
                aria-selected={p.id === at}
                aria-label={`${p.chip}, ${where.toLowerCase()}`}
                onClick={() => onSwitch(p.id)}
                className={`flex-1 min-w-0 px-1 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all ${p.id === at ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
              >
                {p.chip}
              </button>
            ))}
          </Fragment>
        ))}
      </div>
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
