import { useEffect, useRef, useState } from 'react'
import { playBeep, playGo, playTick, unlockAudio } from '../../utils/sound'
import { useCountdown, useWakeLock } from '../../hooks/timing'
import { workouts, STRETCH_ROUTINE, COOL_DOWNS, COOL_DOWN_BY_ID, FULL_BODY, FULL_BODY_BY_ID, TARGETED } from '../../data/workout'
import { equipmentName } from '../../data/targeted'
import { gapsAfter, EXERCISE_BY_ID, isCore } from '../../data/exercises'
import { weekRange, sameDay, weekdayOf } from '../../utils/days'
import { TimerBar } from './TimerBar'
import { StretchesTab } from './StretchesTab'
import { ExercisePicker } from './pickers'
import { ConfirmSheet, SettingsSheet } from '../ui/Sheet'
import { DayPicker } from '../ui/DayPicker'
import { LogButton } from '../ui/LogButton'
import { CoveragePill, AddRow } from './coverage'
import { SwipeRow } from '../ui/SwipeRow'
import { useDragReorder } from '../../hooks/useDragReorder'
import { useScope } from '../../hooks/useScope'
import { DiffBar, WeekTag, OffRow } from './weekDiff'
import { SlotRows } from './slots'
import { warmupSetLabel } from '../../utils/format'
import { WarmupCard } from './WarmupCard'
import { ExerciseCard } from './ExerciseCard'

let timerSeq = 0

export default function WorkoutDetail({ workoutId, store, onBack, onSwitch }) {
  // The full-body stretch routine and the cool-downs reuse this screen with
  // just their stretches.
  const cool = COOL_DOWN_BY_ID[workoutId]
  const workout = workouts[workoutId] ?? cool ?? STRETCH_ROUTINE
  // The Full Body Stretch and the cool-downs: stretches only.
  const isRoutine = !workouts[workoutId]
  const targeted = workoutId === TARGETED.id
  const [tab, setTab] = useState(isRoutine ? 'stretches' : 'exercises')
  const [adding, setAdding] = useState(null) // 'main' | 'core': the exercise bank is open
  // The first set ticked (or warm-up, or last stretch) on a rest day asks whether it's
  // still a rest day, once. A plan already ticked when you open it doesn't ask.
  const stamps = store.stampsOf(workoutId)
  // Ones you can do more than once a week, and how far the one under way got.
  const repeatable = !!FULL_BODY_BY_ID[workoutId] || targeted || workoutId === STRETCH_ROUTINE.id || !!COOL_DOWN_BY_ID[workoutId]
  const current = repeatable ? store.currentSession(workoutId) : null
  const started = !!current && ((current.done ?? 0) > 0 || current.stretched > 0)
  const [ending, setEnding] = useState(false)
  const [pickingDay, setPickingDay] = useState(false)
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

  // Adding or removing an exercise, or adding Core, asks: just this week, or
  // every week after? (Or, for one you can do any number of times, this
  // time or every time.)
  const [ask, scopeSheet] = useScope(store, workoutId)
  // What's different from every week's version: tagged, struck through, and
  // a bar to reset it. Build a Workout's are made fresh each time, so they
  // have none.
  const diff = !targeted && !store.past ? store.weekDiff(workoutId) : null

  // Swiping an exercise away, saying so if it's the only one for an area.
  function removeExercise(ex) {
    const { main, core } = store.getExerciseSections(workoutId)
    const inCore = core.some(x => x.id === ex.id)
    const list = inCore ? core : main
    const gaps = gapsAfter(list, list.filter(x => x.id !== ex.id), inCore ? 'core' : workoutId)
    ask(
      `Remove ${ex.name}?`,
      scope => store.removeExercise(workoutId, ex.id, scope),
      gaps.length ? `It’s the only exercise here for ${gaps.join(' and ')}, so that will be left uncovered.` : null,
    )
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
      // The last hold done: fold its card, as ticking the last set does.
      if (left === 0) setOpenId(id => (id === a.exercise.id ? null : id))
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
  // Times `picked` (a set's own clock), or the next set not done.
  function startHold(exercise, picked) {
    const all = store.getLog(workoutId, exercise).all
    const set = picked ?? all.find(x => !x.done) ?? all[0]
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
  // A built workout's empty slots (main or Core) count as still to do.
  const slotsIn = core => (targeted ? store.targeted.slots.filter(x => (x.area === 'core') === core).length : 0)
  const partDone = (list, core) => list.length > 0 && !slotsIn(core) && list.every(finished)
  const partProgress = (list, core) => `${list.filter(finished).length} of ${list.length + slotsIn(core)} Completed`
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
        onTimer={store.getSetup(exercise).mode === 'hold' ? set => startHold(exercise, set) : null}
        tag={diff?.exercises.added.includes(exercise.id) && <WeekTag repeat={repeatable} />}
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

  // Taken out just for now, in their own list (main or Core).
  const offRows = core => (diff?.exercises.dropped ?? [])
    .filter(id => isCore(EXERCISE_BY_ID[id]) === core)
    .map(id => <OffRow key={id} name={EXERCISE_BY_ID[id].name} repeat={repeatable} />)

  const exerciseList = store.getExercises(workoutId)
  const exerciseDone = exerciseList.filter(e => store.getLog(workoutId, e).all.every(x => x.done)).length
  const stretchList = store.getStretches(workout.id)
  const stretchDone = stretchList.filter(s => store.getStretchDone(workoutId, s.id)).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 bg-stone-50 shrink-0">
        <div className="flex items-center justify-between gap-3 mb-4">
          <button onClick={onBack} className="flex items-center gap-1.5 text-accent-500 active:opacity-70">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            {/* In a saved week, back goes to that week. */}
            <span className="text-sm font-medium">{store.past ? weekRange(store.weekStart) : 'Workouts'}</span>
          </button>
          {/* Full-body days, the Full Body Stretch and cool-downs go on the day
              they're done (each moves from its line on the card); one you
              can't finish is ended here and still logged. */}
          {/* One built with nothing done yet can be called off, as if it
              never happened. */}
          {(targeted || FULL_BODY_BY_ID[workoutId]) && !store.past && !started && !store.getWarmupDone(workoutId) ? (
            <button onClick={() => { store.discard(workoutId); onBack() }} className="px-3 py-1.5 rounded-full bg-stone-100 text-stone-700 text-sm font-medium active:bg-stone-200">
              Cancel
            </button>
          ) : repeatable ? (
            started && !current.finished && (
              <button onClick={() => setEnding(true)} className="px-3 py-1.5 rounded-full bg-stone-100 text-stone-700 text-sm font-medium active:bg-stone-200">
                End
              </button>
            )
          ) : (
            <DayPill stamps={stamps} today={store.today} past={store.past} onClick={() => setPickingDay(true)} />
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">{FULL_BODY_BY_ID[workoutId] ? 'Full Body' : targeted ? store.planName(workoutId) : workout.short}</h1>
        </div>
        {FULL_BODY_BY_ID[workoutId] ? (
          <FullBodySwitch at={workoutId} onSwitch={onSwitch} />
        ) : cool ? (
          // Switch if you picked the wrong activity; each keeps its own list.
          <div className="bg-stone-100 rounded-xl p-1 flex mt-3" role="tablist" aria-label="What you did">
            {COOL_DOWNS.map(c => (
              <button
                key={c.id}
                role="tab"
                aria-selected={c.id === workoutId}
                onClick={() => onSwitch(c.id)}
                className={`flex-auto px-2 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${c.id === workoutId ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`}
              >
                {c.chip}
              </button>
            ))}
          </div>
        ) : !isRoutine && (
          <p className="text-stone-400 text-sm mt-1">{targeted ? equipmentName(store.targeted.eq) : workout.name}</p>
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
        {diff?.differs && <DiffBar repeat={repeatable} onReset={() => store.resetWeek(workoutId)} />}
        {/* The plan in three parts: an optional warm-up, the main workout,
            and an optional Core section. */}
        {tab === 'exercises' && (
          <>
            <PartHead title="Warm-up" right={store.getWarmup(workoutId).on && store.getWarmupDone(workoutId) ? 'Done ✓' : null} done />
            <WarmupCard workoutId={workoutId} store={store} onStart={startWarmup} />

            <PartHead
              title="Main workout"
              pill={<CoveragePill list={sections.main} area={workoutId} />}
              right={partProgress(sections.main, false)}
              done={partDone(sections.main, false)}
            />
            {sections.main.map(exerciseCard)}
            {offRows(false)}
            {targeted && <SlotRows kind="exercise" slots={store.targeted.slots} show={x => x.area !== 'core'} store={store} />}
            <AddRow label="Add exercise" onClick={() => setAdding('main')} />

            {sections.coreOn ? (
              <>
                <PartHead
                  title="Core"
                  pill={<CoveragePill list={sections.core} area="core" />}
                  right={sections.core.length + slotsIn(true) ? partProgress(sections.core, true) : null}
                  done={partDone(sections.core, true)}
                />
                {sections.core.map(exerciseCard)}
                {offRows(true)}
                {targeted && <SlotRows kind="exercise" slots={store.targeted.slots} show={x => x.area === 'core'} store={store} />}
                <AddRow label="Add core exercise" onClick={() => setAdding('core')} />
              </>
            ) : (
              <>
                <PartHead title="Core" />
                {offRows(true)}
                <AddRow
                  label="Add core"
                  note="abs & obliques"
                  onClick={() => {
                    // No core exercises yet (Chest & Shoulders starts with
                    // none): pick one, and adding it turns Core on.
                    if (sections.core.length === 0) setAdding('core')
                    else ask('Add Core?', scope => store.setCoreOn(workoutId, true, scope))
                  }}
                />
              </>
            )}

          </>
        )}

        {tab === 'stretches' && (
          <StretchesTab workout={workout} store={store} diff={diff} repeat={repeatable} onTimer={startStretch} />
        )}
      </div>

      {adding && (
        <ExercisePicker
          workoutId={workoutId}
          store={store}
          section={adding}
          onPick={id => {
            setAdding(null)
            ask(`Add ${EXERCISE_BY_ID[id].name}?`, scope => store.addExercise(workoutId, id, scope))
          }}
          onClose={() => setAdding(null)}
        />
      )}
      {scopeSheet}
      {ending && (
        <ConfirmSheet
          title="End now?"
          body={FULL_BODY_BY_ID[workoutId] || targeted
            ? `It’s logged as it is: ${current.done}/${current.total} sets and ${current.stretched}/${current.stretches} stretches. It counts as a workout only when every set is done.`
            : `It’s logged as it is: ${current.stretched}/${current.stretches} stretches. It counts as a stretch day only when every stretch is done.`}
          confirmLabel="End"
          onConfirm={() => { store.endEarly(workoutId); setEnding(false); onBack() }}
          onClose={() => setEnding(false)}
        />
      )}
      {pickingDay && (
        <PlanDaySheet
          store={store}
          stamps={stamps}
          onPick={at => store.setPlanDay(workoutId, at)}
          onClose={() => setPickingDay(false)}
        />
      )}
    </div>
  )
}

// A part's heading in a plan: its name, and on the right its progress (blue
// once it's all done).
function PartHead({ title, pill, right, done }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-1 pt-3 first:pt-0">
      <span className="flex items-baseline gap-2">
        <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">{title}</p>
        {pill}
      </span>
      {right && <span className={`text-xs font-semibold ${done ? 'text-accent-500' : 'text-stone-400'}`}>{right}</span>}
    </div>
  )
}

// The day a plan goes on, top right: Today until you pick another day, then
// that day in blue; once something's ticked, the day it was logged. Tap to
// pick or change it.
function DayPill({ stamps, today, past, onClick }) {
  const logged = stamps.at ?? stamps.warmedAt ?? stamps.stretchedAt
  const shown = logged ?? stamps.day
  const isToday = shown ? sameDay(new Date(shown), today) : !past
  const text = logged
    ? `Logged ${isToday ? 'today' : weekdayOf(logged)}`
    : isToday ? 'Today'
    : shown ? new Date(shown).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    : 'Pick a day'
  return (
    <button
      onClick={onClick}
      aria-label={`${text}. Change the day`}
      className={`flex items-center gap-1 pl-3 pr-2.5 py-1.5 rounded-full text-sm font-medium active:opacity-70 ${isToday ? 'bg-stone-100 text-stone-700' : 'bg-accent-50 text-accent-600'}`}
    >
      {text}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" className="opacity-60" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
    </button>
  )
}

// Which day a plan goes on. Before anything's ticked it sets the day ticks
// land on; after, it moves the whole session (sets, warm-up, stretches).
function PlanDaySheet({ store, stamps, onPick, onClose }) {
  const logged = stamps.at ?? stamps.warmedAt ?? stamps.stretchedAt
  const [at, setAt] = useState(logged ?? stamps.day ?? store.today.toISOString())
  const today = sameDay(new Date(at), store.today)
  return (
    <SettingsSheet title="Which day?" closeLabel="Cancel" onClose={onClose}>
      <p className="text-stone-500">
        {logged ? 'Move this session (sets, warm-up and stretches) to another day.' : 'Everything you tick in this plan goes on this day.'}
      </p>
      <DayPicker now={store.today} dayLog={store.dayLog} at={at} onChange={setAt} />
      <LogButton onSave={() => { onPick(at); onClose() }}>
        {logged ? (today ? 'Move to today' : `Move to ${weekdayOf(at)}`) : today ? 'Log today' : `Log on ${weekdayOf(at)}`}
      </LogButton>
    </SettingsSheet>
  )
}

// The three full-body days as a segmented control. Switch if you picked
// the wrong one; each keeps its own list.
function FullBodySwitch({ at, onSwitch }) {
  return (
    <div className="mt-3 bg-stone-100 rounded-xl p-1 flex" role="tablist" aria-label="What you're working out with">
      {FULL_BODY.map(p => (
        <button
          key={p.id}
          role="tab"
          aria-selected={p.id === at}
          aria-label={p.label}
          onClick={() => onSwitch(p.id)}
          className={`flex-1 min-w-0 px-1 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all ${p.id === at ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
        >
          {p.chip}
        </button>
      ))}
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
